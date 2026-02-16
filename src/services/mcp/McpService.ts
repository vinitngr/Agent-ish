import * as fs from 'fs';
import * as path from 'path';
import { Agent } from '../../agent/core/Agent';
import { ITool, ToolParameter, ToolResult } from '../../types/Tool';
import { IContext } from '../../types/Runtime';
import { logger } from '../../utils/logger';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { mcpConfigSchema, validate } from '../../utils/validation';

const log = logger.child('mcp-service');

interface McpServerConfig {
  url: string;
  enabled: boolean;
  headers?: Record<string, string>;
}

interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

export class McpService {
  private agent: Agent;
  private clients: Map<string, Client> = new Map();
  private toolsByServer: Map<string, string[]> = new Map();
  private configPath: string;

  constructor(agent: Agent, configPath?: string) {
    this.agent = agent;
    this.configPath = configPath || path.join(process.cwd(), 'config', 'mcp.json');
  }

  async start(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      log.warn(`No MCP config found at ${this.configPath}, skipping MCP tool loading`);
      return;
    }

    await this.loadConfig(this.configPath);

    if (this.agent.config.monitoring?.config !== false) {
       this.watchConfig(this.configPath);
    }
  }

  async stop(): Promise<void> {
    for (const [serverName] of this.clients) {
      await this.disconnectServer(serverName);
    }
  }

  private watchConfig(configPath: string) {
    let fsWait: NodeJS.Timeout | null = null;
    
    fs.watch(configPath, (event, filename) => {
      if (fsWait) return;
      fsWait = setTimeout(async () => {
        fsWait = null;
        log.info('MCP config changed, reloading...');
        await this.loadConfig(configPath);
      }, 100);
    });
  }

  private async loadConfig(configPath: string) {
    try {
      if (!fs.existsSync(configPath)) return;
      
      const content = fs.readFileSync(configPath, 'utf-8');
      if (!content.trim()) return;

      const rawConfig = JSON.parse(content);
      const config = validate(mcpConfigSchema, rawConfig);
      const activeServers = new Set<string>();

      for (const [serverName, serverConfig] of Object.entries(config.servers)) {
        if (!serverConfig.enabled) continue;
        activeServers.add(serverName);

        if (!this.clients.has(serverName)) {
           await this.connectAndRegister(serverName, serverConfig);
        }
      }

      for (const [serverName] of this.clients) {
        if (!activeServers.has(serverName)) {
          await this.disconnectServer(serverName);
        }
      }
    } catch (error) {
      log.error('Failed to reload MCP config:', error);
    }
  }

  private async disconnectServer(serverName: string) {
    log.info(`Disconnecting MCP server: ${serverName}`);
    
    // Unregister tools
    const toolNames = this.toolsByServer.get(serverName) || [];
    for (const name of toolNames) {
      this.agent.tools.unregister(name);
    }
    this.toolsByServer.delete(serverName);

    const client = this.clients.get(serverName);
    if (client) {
      try {
        await client.close();
      } catch (e) { /* ignore */ }
      this.clients.delete(serverName);
    }
  }

  private async connectAndRegister(serverName: string, config: McpServerConfig): Promise<void> {
    try {
      const transport = new SSEClientTransport(new URL(config.url), {
        eventSourceInit: {
          headers: config.headers
        } as any
      });
      const client = new Client({ name: 'tobi-agent', version: '1.0.0' });
  
      await client.connect(transport);
      this.clients.set(serverName, client);
      log.info(`Connected to MCP server: ${serverName}`);
  
      const { tools } = await client.listTools();
  
      const registeredTools: string[] = [];
      for (const mcpTool of tools) {
        const agentTool = this.convertToAgentTool(client, serverName, mcpTool);
        this.agent.tools.register(agentTool);
        registeredTools.push(agentTool.name);
      }
      
      this.toolsByServer.set(serverName, registeredTools);
      log.info(`Registered ${tools.length} tools from MCP server "${serverName}"`);
    } catch (error: any) {
      if (error?.message?.includes('ECONNREFUSED')) {
        log.warn(`Could not connect to MCP server "${serverName}" at ${config.url} (Connection Refused). Is it running?`);
        log.debug(`Connection error details:`, error);
      } else {
        log.error(`Failed to connect to MCP server ${serverName}:`, error);
      }
    }
  }

  private convertToAgentTool(client: Client, serverName: string, mcpTool: any): ITool {
    const parameters: ToolParameter[] = [];

    if (mcpTool.inputSchema?.properties) {
      const required = mcpTool.inputSchema.required || [];
      for (const [paramName, paramSchema] of Object.entries<any>(mcpTool.inputSchema.properties)) {
        parameters.push({
          name: paramName,
          type: this.mapJsonSchemaType(paramSchema.type),
          description: paramSchema.description || '',
          required: required.includes(paramName),
        });
      }
    }

    return {
      name: `mcp.${serverName}.${mcpTool.name}`,
      description: mcpTool.description || `MCP tool from ${serverName}`,
      parameters,
      async execute(_context: IContext, args: Record<string, unknown>): Promise<ToolResult> {
        try {
          const result = await client.callTool({ name: mcpTool.name, arguments: args });
          return {
            success: true,
            data: result.content,
            metadata: { source: `mcp:${serverName}` }
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'MCP tool execution failed'
          };
        }
      }
    };
  }

  private mapJsonSchemaType(type: string): ToolParameter['type'] {
    const map: Record<string, ToolParameter['type']> = {
      string: 'string',
      number: 'number',
      integer: 'number',
      boolean: 'boolean',
      object: 'object',
      array: 'array',
    };
    return map[type] || 'string';
  }
}

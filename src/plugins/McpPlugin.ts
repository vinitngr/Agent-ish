import { Agent } from '../agent/core/Agent';
import { IPlugin } from '../types/Plugin';
import { McpService } from '../services/mcp/McpService';

export class McpPlugin implements IPlugin {
  name = 'mcp';
  version = '1.0.0';
  description = 'Loads tools from MCP SSE servers';
  private configPath?: string;

  constructor(configPath?: string) {
    this.configPath = configPath;
  }

  async register(agent: Agent, options?: any): Promise<void> {
    const service = new McpService(agent, this.configPath);
    service.start().catch((err) => {
      console.error('[McpPlugin] Failed to start MCP service:', err);
    });
  }
}


import * as fs from 'fs';
import * as path from 'path';
import { Agent } from '../src/agent/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { McpPlugin } from '../src/plugins/McpPlugin';
import { TerminalPlugin } from '../src/plugins/TerminalPlugin';

const RESULTS_FILE = 'test.result.txt';
const TEST_SKILL_PATH = path.join(process.cwd(), 'skills', 'test-dynamic-skill.md');
// @ts-ignore
import http from 'http';

let mockServer: any;

function startMockMcpServer() {
  log('Starting Mock MCP Server on port 3001...');
  
  let sseResponse: any = null;

  mockServer = http.createServer((req: any, res: any) => {
    log(`[MockServer] Request: ${req.method} ${req.url}`); // DEBUG LOG
    
    if (req.url === '/sse') {
      sseResponse = res;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`event: endpoint\ndata: http://localhost:3001/messages\n\n`);
      log('[MockServer] SSE connection established');
    } else if (req.url === '/messages' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => body += chunk);
      req.on('end', () => {
        const json = JSON.parse(body);
        log(`[MockServer] JSON-RPC received: ${json.method}`); // DEBUG LOG
        
        // Respond to POST immediately
        res.writeHead(202);
        res.end('Accepted');

        if (!sseResponse) {
            log('[MockServer] ERROR: No SSE connection to send response to!');
            return;
        }

        const sendSse = (data: any) => {
            sseResponse.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
        };

        if (json.method === 'initialize') {
            sendSse({
                jsonrpc: '2.0',
                id: json.id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { 
                        tools: { listChanged: true },
                        logging: {},
                        resources: {} 
                    },
                    serverInfo: { name: 'mock-server', version: '1.0.0' }
                }
            });
        } else if (json.method === 'notifications/initialized') {
             log('[MockServer] Initialized notification received');
        } else if (json.method === 'tools/list') {
            sendSse({
                jsonrpc: '2.0',
                id: json.id,
                result: {
                    tools: [{
                        name: 'mock_tool',
                        description: 'A mock tool for testing',
                        inputSchema: { type: 'object', properties: { input: { type: 'string' } } }
                    }]
                }
            });
        }
      });
    } else {
        res.writeHead(404);
        res.end();
    }
  });
  mockServer.listen(3001);
}

function stopMockServer() {
    if (mockServer) mockServer.close();
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  fs.appendFileSync(RESULTS_FILE, line + '\n');
}

async function runTest() {
  // Clear previous results
  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
  if (fs.existsSync(TEST_SKILL_PATH)) fs.unlinkSync(TEST_SKILL_PATH);

  startMockMcpServer(); // START MOCK SERVER

  log('=== STARTING AGENT INTEGRATION TEST ===');

  const agent = new Agent();

  try {
    // 1. Register Plugins
    log('1. Registering Plugins...');
    await agent.use(new CorePlugin());
    await agent.use(new McpPlugin()); 
    // await agent.use(new TerminalPlugin()); // Skip terminal for automated test to avoid stdin blocking

    // 2. Initialize
    log('2. Initializing Agent...');
    await agent.init();
    
    // 3. Boot (Start Services)
    log('3. Booting Agent...');
    await agent.boot();

    // 4. Verify Tools
    log('\n--- VERIFYING TOOLS ---');
    const toolNames = agent.tools.list();
    log(`Registered Tools Count: ${toolNames.length}`);
    toolNames.forEach(name => log(` - Tool: ${name}`));

    if (toolNames.some(name => name.startsWith('system.'))) {
        log('✅ System Tools loaded');
    } else {
        log('❌ System Tools MISSING');
    }

    // 5. Verify Skills (Initial)
    log('\n--- VERIFYING SKILLS (INITIAL) ---');
    const skillNames = agent.skills.list();
    log(`Initial Skills Count: ${skillNames.length}`);
    skillNames.forEach(name => log(` - Skill: ${name}`));

    // 6. Test Hot Reloading (create a file)
    log('\n--- TESTING HOT RELOAD (SKILLS) ---');
    const testSkillContent = `---
name: dynamic-test-skill
description: A skill created during integration testing
---
# Dynamic Test Skill
This is a test.
`;
    
    log(`Creating test skill at: ${TEST_SKILL_PATH}`);
    fs.writeFileSync(TEST_SKILL_PATH, testSkillContent);

    log('Waiting 3 seconds for watcher...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const updatedSkillNames = agent.skills.list();
    log(`Updated Skills Count: ${updatedSkillNames.length}`);
    
    const found = updatedSkillNames.find(name => name === 'dynamic-test-skill');
    if (found) {
        log('✅ HOT RELOAD SUCCESS: Dynamic skill found!');
    } else {
        log('❌ HOT RELOAD FAILED: Dynamic skill not found.');
    }

    // 7. MCP Check (Mock/Config)
    log('\n--- VERIFYING MCP ---');
    log('MCP Plugin initialized without error.');
    
    // Wait a bit for MCP to connect (it's async)
    log('Waiting 5 seconds for MCP connection...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const updatedToolNames = agent.tools.list();
    const mcpTools = updatedToolNames.filter(name => name.startsWith('mcp.'));
    
    if (mcpTools.length > 0) {
        log(`✅ MCP Tools found: ${mcpTools.length}`);
        mcpTools.forEach(t => log(`   - ${t}`));
    } else {
        log('❌ MCP tools NOT found (Connection failed?)');
    }

    log('\n=== TEST COMPLETE ===');

  } catch (error) {
    log(`❌ FATAL ERROR: ${error}`);
    console.error(error);
  } finally {
    // Cleanup
    log('Cleaning up...');
    if (fs.existsSync(TEST_SKILL_PATH)) fs.unlinkSync(TEST_SKILL_PATH);
    await agent.shutdown();
    stopMockServer(); // STOP MOCK SERVER
    process.exit(0);
  }
}

runTest();

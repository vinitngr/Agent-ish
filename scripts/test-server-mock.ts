import { Agent } from '../src/core/Agent';
import { CorePlugin } from '../src/plugins/CorePlugin';
import { LLMPlugin } from '../src/plugins/LLMPlugin';
import { ISessionStore, SessionData } from '../src/core/types/Runtime';

// ----------------------------------------------------------------------------
// 1. MOCK APPLICATION DATABASE (Mimicking MongoDB, Redis, Postgres, etc.)
// ----------------------------------------------------------------------------
class CustomDatabaseStore implements ISessionStore {
  private db: Map<string, SessionData> = new Map();

  async get(id: string): Promise<any | null> {
    console.log(`[DB] Reading session ${id} from custom database...`);
    return this.db.get(id) || null;
  }

  async set(id: string, data: any): Promise<void> {
    console.log(`[DB] Saving session ${id} to custom database...`);
    this.db.set(id, data);
  }

  async list(): Promise<string[]> {
    return Array.from(this.db.keys());
  }

  async delete(id: string): Promise<void> {
    this.db.delete(id);
  }
}

// ----------------------------------------------------------------------------
// 2. SERVER SETUP (Booting the daemon once)
// ----------------------------------------------------------------------------
async function startServer() {
  console.log("🚀 Booting Server Daemon...");
  
  const customDb = new CustomDatabaseStore();
  
  const agent = new Agent();
  agent.setLogLevel('info');

  // Register an APP-SPECIFIC Tool dynamically on the server
  agent.tools.register({
    name: 'app.getUserProfile',
    description: 'Get the profile of a user by username',
    parameters: [{
      name: 'username',
      type: 'string',
      description: 'The username to lookup',
      required: true
    }],
    execute: async (args: any) => {
      console.log(`\n\t🔧 [APP TOOL EXEC] Looking up user: ${args.username}\n`);
      return JSON.stringify({ name: 'Vinit', role: 'Admin', status: 'Active' });
    }
  });

  await agent.init();
  
  // Load standard plugins
  await agent.use(new CorePlugin());
  await agent.use(new LLMPlugin());
  
  // Inject our custom DB into the Agent! The Core will use this instead of its default memory.
  agent.setSessionStore(customDb);

  await agent.boot();
  
  return agent;
}

// ----------------------------------------------------------------------------
// 3. MOCKING INCOMING HTTP REQUESTS
// ----------------------------------------------------------------------------
async function run() {
  const agent = await startServer();
  
  // We mimic a user connecting from a web UI with a specific session ID
  const sessionId = "user_vinit_chat_123";

  console.log("\n=======================================================");
  console.log("🌐 HTTP REQUEST 1: User asks a question");
  console.log("=======================================================");
  
  // App Layer Interceptor: We fetch the session, or it creates a new one
  // let session = await customDb.getSession(sessionId);
  
  // App Layer Interceptor: We dynamically restrict the AI to ONLY use our custom tool
  // so it doesn't use the file system tools on the server!
  const response1 = await agent.execute(
    "Hi, can you look up the profile for username 'vinit_admin' using the app tool?", 
    { 
      model: 'gemini:gemini-flash-latest',
      sessionId: sessionId,
      allowedTools: ['app.getUserProfile'] // Pipeline will intercept and filter!
    }
  );
  console.log("\n🤖 RESPONSE 1:", response1);

  console.log("\n=======================================================");
  console.log("🌐 HTTP REQUEST 2: User asks a follow-up (30 seconds later)");
  console.log("=======================================================");
  
  // App Layer: We just send the follow-up. The Core will automatically fetch 
  // the history from CustomDatabaseStore!
  const response2 = await agent.execute(
    "What was the role in that profile you just found?", 
    {
      model: 'gemini:gemini-flash-latest',
      sessionId: sessionId,
      allowedTools: ['app.getUserProfile']
    }
  );
  console.log("\n🤖 RESPONSE 2:", response2);

  console.log("\n✅ Server test complete!");
}

run().catch(console.error);

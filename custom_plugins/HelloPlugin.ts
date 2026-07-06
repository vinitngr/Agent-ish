import { Agent } from '../src/agent/core/Agent';

export default class HelloPlugin {
  name = 'hello-command';
  
  async register(agent: Agent) {
    agent.addInputInterceptor(async (input) => {
      if (input.trim() === '/test') {
        return 'Hello World! This command was added while the daemon was running. 🚀';
      }
      return null; 
    });
  }
}
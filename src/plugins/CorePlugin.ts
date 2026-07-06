import { Agent } from '../core/Agent';
import { IPlugin } from '../core/types/Plugin';
import { systemTools } from '../tools/system';
import { webTools } from '../tools/web';
import { customTools } from '../tools/custom';

export class CorePlugin implements IPlugin {
  name = 'core';
  version = '1.0.0';

  async register(agent: Agent, options?: any): Promise<void> {
    const allTools = [...systemTools, ...webTools, ...customTools];
    
    for (const tool of allTools) {
      agent.tools.register(tool);
    }
  }
}

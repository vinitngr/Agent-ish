import { Agent } from '../agent/core/Agent';
import { IPlugin } from '../types/Plugin';
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

    await this.loadSkills(agent, options);
  }

  private async loadSkills(agent: Agent, options?: any): Promise<void> {
    const { MarkdownSkillLoader } = await import('../skills/loaders/MarkdownSkillLoader');
    const skillLoader = new MarkdownSkillLoader();
    
    const skillsDir = options?.skillsDir || agent.config.modules?.skillsDir || './skills';
    const absoluteDir = require('path').resolve(process.cwd(), skillsDir);
    
    if (!require('fs').existsSync(absoluteDir)) {
      return;
    }

    const skills = await skillLoader.loadSkills(absoluteDir);
    for (const skill of skills) {
      agent.skills.register(skill);
    }

    if (agent.config.monitoring?.skills !== false) {
      skillLoader.watch(absoluteDir, 
        (skill) => {
          agent.skills.register(skill);
        },
        (name) => {
          agent.skills.unregister(name);
        }
      );
    }
  }
}

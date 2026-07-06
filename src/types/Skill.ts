import { IContext } from './Runtime';

export interface SkillManifest {
  name: string;
  description: string;
  version: string;
  tools: string[];
  entryPoint: string;
}

export interface ISkill {
  name: string;
  description: string;
  requiredTools: string[];
  execute(context: IContext): Promise<void>;
}

export type SkillFactory = () => ISkill | Promise<ISkill>;

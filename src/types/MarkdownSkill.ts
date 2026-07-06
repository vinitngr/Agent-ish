import { ISkill } from './Skill';
import { IContext } from './Runtime';

export interface MarkdownSkill extends ISkill {
  content: string;
  path: string;
}

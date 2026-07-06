import { MarkdownSkillLoader } from '../src/skills/loaders/MarkdownSkillLoader';
import * as path from 'path';

async function main() {
  const loader = new MarkdownSkillLoader();
  const skillsDir = path.resolve(__dirname, '../src/skills/examples');
  
  console.log(`Loading skills from: ${skillsDir}`);
  
  try {
    const skills = await loader.loadSkills(skillsDir);
    
    console.log(`\nDiscovered ${skills.length} skills:`);
    skills.forEach(skill => {
      console.log(`\n---------------------------------------------------`);
      console.log(`Name: ${skill.name}`);
      console.log(`Description: ${skill.description}`);
      console.log(`Path: ${skill.path}`);
      console.log(`Content Preview: ${skill.content.substring(0, 100).replace(/\n/g, ' ')}...`);
    });
    console.log(`\n---------------------------------------------------`);

  } catch (error) {
    console.error('Error loading skills:', error);
  }
}

main();

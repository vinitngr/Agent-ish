import * as fs from 'fs';
import * as path from 'path';
import { MarkdownSkill } from '../../../types/MarkdownSkill';
import { logger } from '../../../utils/logger';

const log = logger.child('markdown-skill-loader');

export class MarkdownSkillLoader {
  
  async loadSkills(directory: string): Promise<MarkdownSkill[]> {
    const skills: MarkdownSkill[] = [];
    
    if (!fs.existsSync(directory)) {
      log.warn(`Skills directory not found: ${directory}`);
      return skills;
    }

    const files = this.getFilesRecursively(directory);
    this.processFiles(files, skills);
    
    return skills;
  }

  async watch(directory: string, onUpdate: (skill: MarkdownSkill) => void, onDelete: (name: string) => void): Promise<void> {
    if (!fs.existsSync(directory)) return;

    log.info(`Watching skills directory: ${directory}`);
    
    const fileToSkillMap = new Map<string, string>();

    const initialSkills = this.getFilesRecursively(directory);
    for (const file of initialSkills) {
      if (path.basename(file) === 'SKILL.md') {
        const skill = this.parseSkill(file);
        if (skill) {
          fileToSkillMap.set(file, skill.name);
        }
      }
    }

    try {
      const chokidar = await import('chokidar');
      const watcher = chokidar.watch(directory, { 
        ignoreInitial: true,
        persistent: true
      });

      watcher.on('all', (event, filename) => {
        if (filename && path.basename(filename) === 'SKILL.md') {
          const fullPath = path.join(directory, filename);
          
          if (event === 'add' || event === 'change') {
             const skill = this.parseSkill(fullPath);
             if (skill) {
                fileToSkillMap.set(fullPath, skill.name);
                log.info(`Skill updated: ${skill.name}`);
                onUpdate(skill);
             }
          } else if (event === 'unlink') {
             const skillName = fileToSkillMap.get(fullPath);
             if (skillName) {
               log.info(`Skill file deleted: ${skillName}`);
               onDelete(skillName);
               fileToSkillMap.delete(fullPath);
             }
          }
        }
      });
    } catch (error) {
      log.error(`Failed to initialize skill watcher:`, error);
    }
  }

  private processFiles(files: string[], skills: MarkdownSkill[]) {
    for (const file of files) {
      if (path.basename(file) === 'SKILL.md') {
        try {
          const skill = this.parseSkill(file);
          if (skill) {
            skills.push(skill);
            log.info(`Loaded skill: ${skill.name}`);
          }
        } catch (error) {
          log.error(`Failed to load skill from ${file}: ${error}`);
        }
      }
    }
  }

  private getFilesRecursively(directory: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(directory);
    
    list.forEach((file) => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat && stat.isDirectory()) {
         results = results.concat(this.getFilesRecursively(filePath));
      } else {
        results.push(filePath);
      }
    });
    
    return results;
  }

  private parseSkill(filePath: string): MarkdownSkill | null {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = fileContent.match(frontmatterRegex);

    if (!match) {
        log.warn(`Invalid skill format in ${filePath}. Missing frontmatter.`);
        return null;  
    }

    const frontmatter = match[1];
    const content = match[2].trim();
    
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descriptionMatch = frontmatter.match(/description:\s*(.+)/);
    
    if (!nameMatch || !descriptionMatch) {
       log.warn(`Invalid skill metadata in ${filePath}. Missing name or description.`);
       return null;
    }

    return {
      name: nameMatch[1].trim(),
      description: descriptionMatch[1].trim(),
      content: content,
      path: filePath,
      requiredTools: [],
      execute: async () => {
      }
    };
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { SkillManifest } from '../../types/Skill';
import { logger } from '../../utils/logger';

const log = logger.child('skill-loader');

export class SkillLoader {
  private skillsDir: string;

  constructor(skillsDir: string) {
    this.skillsDir = path.resolve(skillsDir);
  }

  async discoverManifests(): Promise<SkillManifest[]> {
    const manifests: SkillManifest[] = [];

    if (!fs.existsSync(this.skillsDir)) {
      log.warn(`Skills directory not found: ${this.skillsDir}`);
      return manifests;
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(this.skillsDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw) as SkillManifest;
        manifests.push(manifest);
        log.info(`Discovered skill: ${manifest.name}`);
      } catch (err) {
        log.error(`Failed to load skill manifest: ${manifestPath}`);
      }
    }

    return manifests;
  }

  async loadSkill(manifest: SkillManifest): Promise<unknown> {
    const entryPath = path.join(this.skillsDir, manifest.name, manifest.entryPoint);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Skill entry point not found: ${entryPath}`);
    }

    const mod = await import(entryPath);
    return mod.default || mod;
  }
}

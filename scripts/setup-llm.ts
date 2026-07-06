
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../config/providers.json');
const ENV_PATH = path.resolve(__dirname, '../.env.local');

interface ProviderConfig {
  id: string;
  enabled: boolean;
  apiKeyEnvVar?: string;
  apiKey?: string;
  models: any[];
}

interface AppConfig {
  providers: ProviderConfig[];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('--- Add LLM Provider ---');

  // 1. Select Provider
  console.log('Available Providers:');
  console.log('1. Gemini (Google Generative AI)');
  console.log('2. OpenAI');
  
  const choice = await question('Select provider (1/2): ');
  let providerId = '';
  let defaultEnvVar = '';

  if (choice === '1') {
    providerId = 'gemini';
    defaultEnvVar = 'GOOGLE_GENERATIVE_AI_API_KEY';
  } else if (choice === '2') {
    providerId = 'openai';
    defaultEnvVar = 'OPENAI_API_KEY';
  } else {
    console.error('Invalid choice');
    rl.close();
    return;
  }

  // 2. Enter API Key
  const apiKey = await question(`Enter API Key for ${providerId}: `);
  if (!apiKey) {
    console.error('API Key is required');
    rl.close();
    return;
  }

  // 3. Choose Storage Method
  console.log('\nWhere would you like to save this key?');
  console.log('1. .env.local (Recommended for Security/Git)');
  console.log('2. providers.json (Best for Self-Hosted/Easier Transport)');
  const storageChoice = await question('Select storage (1/2): ');

  let useEnv = true;
  if (storageChoice === '2') {
    useEnv = false;
  }

  if (useEnv) {
    // Update .env.local
    console.log(`Updating ${ENV_PATH}...`);
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    const envVarLine = `${defaultEnvVar}=${apiKey}`;
    const regex = new RegExp(`^${defaultEnvVar}=.*`, 'm');
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, envVarLine);
    } else {
      envContent += `\n${envVarLine}`;
    }
    
    envContent = envContent.replace(/\n\n+/g, '\n').trim() + '\n';
    fs.writeFileSync(ENV_PATH, envContent);
    console.log('API Key saved to .env.local');
  }

  // 4. Update providers.json
  console.log(`Updating ${CONFIG_PATH}...`);
  let config: AppConfig = { providers: [] };
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }

  const existingProviderIndex = config.providers.findIndex(p => p.id === providerId);
  
  let newProviderConfig: any = {
    id: providerId,
    enabled: true,
    models: []
  };

  if (useEnv) {
    newProviderConfig.apiKeyEnvVar = defaultEnvVar;
    // Remove apiKey if it existed from a previous "Direct" setup to avoid confusion
    if (existingProviderIndex >= 0) {
       delete config.providers[existingProviderIndex].apiKey;
    }
  } else {
    newProviderConfig.apiKey = apiKey;
    // Remove env var ref if it existed
    if (existingProviderIndex >= 0) {
       delete config.providers[existingProviderIndex].apiKeyEnvVar;
    }
  }

  if (existingProviderIndex >= 0) {
    config.providers[existingProviderIndex] = {
      ...config.providers[existingProviderIndex],
      ...newProviderConfig,
      enabled: true
    };
    
    // Explicit cleanup just in case spread operator kept old keys
    if (useEnv) {
        delete (config.providers[existingProviderIndex] as any).apiKey;
    } else {
        delete (config.providers[existingProviderIndex] as any).apiKeyEnvVar;
    }

    console.log(`Updated existing ${providerId} configuration.`);
  } else {
    config.providers.push(newProviderConfig);
    console.log(`Added new ${providerId} configuration.`);
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('Configuration updated successfully!');

  rl.close();
}

main().catch(error => {
  console.error('An error occurred:', error);
  rl.close();
});

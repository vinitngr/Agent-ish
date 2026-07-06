import { Socket } from 'net';
import readline from 'readline';

const client = new Socket();
const PORT = 3000;
const HOST = '127.0.0.1';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const args = process.argv.slice(2);
const sessionArg = args.find(a => a.startsWith('--session='));
const isNew = args.includes('--new');
const targetSession = sessionArg ? sessionArg.split('=')[1] : null;

client.connect(PORT, HOST, () => {
  console.log(`Connected to Agent Daemon at ${HOST}:${PORT}`);
  if (isNew) {
      client.write('/new\n');
  } else if (targetSession) {
      client.write(`/load ${targetSession}\n`);
  }
  process.stdout.write('> ');
});

client.on('data', (data) => {
  const text = data.toString();
  console.log(text);
  process.stdout.write('> ');
});

client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

rl.on('line', (input) => {
  if (input.trim() === '/exit') {
    client.write(input);
    client.end();
    process.exit(0);
  }
  client.write(input);
});

import { Socket } from 'net';
import readline from 'readline';

const client = new Socket();
const PORT = 3000;
const HOST = '127.0.0.1';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

client.connect(PORT, HOST, () => {
  console.log(`Connected to Agent Daemon at ${HOST}:${PORT}`);
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

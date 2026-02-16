# CLI Usage


## Connecting to Daemon
Start the main agent daemon first: `npm start`.

```bash
# Standard connect
npx tsx scripts/connect.ts

# Start with a fresh session
npx tsx scripts/connect.ts --new

# Resume or create a specific session
npx tsx scripts/connect.ts --session=debug-task-1
```

## Direct Execution
Run a single command without staying connected. Useful for scripts or CI/CD.

```bash
# Execute prompt and exit
npx tsx src/main.ts --execute "list my files"

# Specify a model
npx tsx src/main.ts --execute "who are you?" --model gemini:gemini-1.5-pro

# Pipe output to a file
npx tsx src/main.ts --execute "ls -R" > folder_structure.txt
```

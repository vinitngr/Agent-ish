import { ITool, ToolResult } from '../../types/Tool';
import { IContext } from '../../types/Runtime';

const readFileTool: ITool = {
  name: 'system.readFile',
  description: 'Read the contents of a file from the filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Absolute path to the file',
      required: true,
    },
  ],
  async execute(_context: IContext, args: Record<string, unknown>): Promise<ToolResult> {
    const fs = await import('fs');
    const filePath = args.path as string;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (err) {
      return { success: false, error: `Failed to read file: ${filePath}` };
    }
  },
};

const writeFileTool: ITool = {
  name: 'system.writeFile',
  description: 'Write content to a file on the filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Absolute path to the file',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to write',
      required: true,
    },
  ],
  async execute(_context: IContext, args: Record<string, unknown>): Promise<ToolResult> {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = args.path as string;
    const content = args.content as string;

    try {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, data: { path: filePath, bytesWritten: content.length } };
    } catch (err) {
      return { success: false, error: `Failed to write file: ${filePath}` };
    }
  },
};

const listDirectoryTool: ITool = {
  name: 'system.listDirectory',
  description: 'List contents of a directory',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Absolute path to the directory',
      required: true,
    },
  ],
  async execute(_context: IContext, args: Record<string, unknown>): Promise<ToolResult> {
    const fs = await import('fs');
    const dirPath = args.path as string;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const items = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
      }));
      return { success: true, data: items };
    } catch (err) {
      return { success: false, error: `Failed to list directory: ${dirPath}` };
    }
  },
};

export const systemTools: ITool[] = [readFileTool, writeFileTool, listDirectoryTool];

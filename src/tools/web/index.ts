import { ITool, ToolResult } from '../../core/types/Tool';
import { IContext } from '../../core/types/Runtime';

const fetchUrlTool: ITool = {
  name: 'web.fetch',
  description: 'Fetch content from a URL via HTTP GET',
  parameters: [
    {
      name: 'url',
      type: 'string',
      description: 'The URL to fetch',
      required: true,
    },
  ],
  async execute(_context: IContext, args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;

    try {
      const response = await fetch(url);
      const text = await response.text();
      return {
        success: true,
        data: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: text.slice(0, 10000),
        },
      };
    } catch (err) {
      return { success: false, error: `Failed to fetch: ${url}` };
    }
  },
};

export const webTools: ITool[] = [fetchUrlTool];

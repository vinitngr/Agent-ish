import { IContext, IInterface } from "../types/Runtime";
import { logger } from "@utils/logger";

export abstract class BaseInterface implements IInterface {
  abstract name: string;
  isTrusted: boolean = false;

  protected context?: IContext;
  protected inputHandler?: (input: string) => Promise<string>;
  private _log?: any;

  protected get log() {
    if (!this._log) {
      this._log = logger.child(this.name || 'interface');
    }
    return this._log;
  }

  async start(context: IContext): Promise<void> {
    this.context = context;
  }

  abstract stop(): Promise<void>;

  onInput(handler: (input: string) => Promise<string>): void {
    this.inputHandler = handler;
  }

  protected async handleInput(input: string): Promise<string> {
    if (this.context?.eventBus) {
      this.context.eventBus.emit('interface:input', this.name, input);
    }

    if (!this.inputHandler) {
      this.log.warn('No input handler registered');
      return 'No input handler registered';
    }

    try {
      const result = await this.inputHandler(input);
      
      if (this.context?.eventBus) {
        this.context.eventBus.emit('interface:output', this.name, result);
      }
      
      return result;
    } catch (error) {
      this.log.error('Error handling input:', error);
      throw error;
    }
  }
}

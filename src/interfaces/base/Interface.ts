import { IInterface, IContext } from '../../types/Runtime';

export abstract class BaseInterface implements IInterface {
  abstract name: string;

  protected inputHandler?: (input: string) => Promise<string>;

  abstract start(context: IContext): Promise<void>;
  abstract stop(): Promise<void>;

  onInput(handler: (input: string) => Promise<string>): void {
    this.inputHandler = handler;
  }

  protected async handleInput(input: string): Promise<string> {
    if (!this.inputHandler) {
      return 'No input handler registered';
    }
    return this.inputHandler(input);
  }
}

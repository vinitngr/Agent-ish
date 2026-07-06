# I/O Interfaces

Interfaces define how users talk to the agent. Examples include Terminal, Socket (TCP), and HTTP.

## Registering an Interface
```typescript
import { MyCustomInterface } from './interfaces/MyCustomInterface';

const iface = new MyCustomInterface();
agent.interfaces.register(iface);
```

## Creating an Interface
Your class must implement `IInterface`.

```typescript
export interface IInterface {
  name: string;
  start(context: any): Promise<void>;
  onInput(callback: (input: string) => void): void;
  // ...
}
```

## Security & Context
The interface should pass its name to `agent.execute` to enable interface-specific filtering.

```typescript
const result = await agent.execute(input, { 
  interface: 'my-custom-iface' 
});
```

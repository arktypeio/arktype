---
hide_table_of_contents: true
---

# inferNode

## text

```ts
export type inferNode<node extends Node<$>, $ = {}> = node extends string
    ? inferTerminal<node, $>
    : node extends Node<$>
    ? inferResolution<node, $> extends infer result
        ? result extends BuiltinClass
            ? result
            : evaluateObjectOrFunction<result>
        : never
    : never
```

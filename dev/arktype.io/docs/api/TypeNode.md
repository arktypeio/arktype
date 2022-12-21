---
hide_table_of_contents: true
---

# TypeNode

## text

```ts
export type TypeNode<scope extends Dictionary = Dictionary> =
    | Identifier<scope>
    | TypeSet<scope>
```

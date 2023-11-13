---
hide_table_of_contents: true
---

# inferDefinition

## text

```ts
export type inferDefinition<def, $> = isAny<def> extends true
    ? never
    : def extends Infer<infer t> | InferredThunk<infer t>
    ? t
    : def extends string
    ? inferString<def, $>
    : def extends List
    ? inferTuple<def, $>
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, $>
    : never
```

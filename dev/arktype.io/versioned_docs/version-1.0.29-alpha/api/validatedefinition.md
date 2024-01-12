---
hide_table_of_contents: true
---

# validateDefinition

## text

```ts
export type validateDefinition<def, $> = [def] extends [(...args: any[]) => any]
    ? def
    : def extends Terminal
    ? def
    : def extends string
    ? validateString<def, $>
    : def extends TupleExpression
    ? validateTupleExpression<def, $>
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<
          objectKindOf<def> extends string ? objectKindOf<def> : domainOf<def>
      >
    : isUnknown<def> extends true
    ? stringKeyOf<$>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>
```

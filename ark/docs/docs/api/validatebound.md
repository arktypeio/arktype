---
hide_table_of_contents: true
---

# validateBound

## text

```ts
export type validateBound<l, r, $> = l extends NumberLiteral
	? validateAst<r, $>
	: l extends [infer leftAst, Comparator, unknown]
	? error<writeDoubleRightBoundMessage<astToString<leftAst>>>
	: isBoundable<inferAst<l, $>> extends true
	? validateAst<l, $>
	: error<writeUnboundableMessage<astToString<l>>>
```

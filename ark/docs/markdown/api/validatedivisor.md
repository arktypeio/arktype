---
hide_table_of_contents: true
---

# validateDivisor

## text

```ts
export type validateDivisor<l, $> = isDivisible<inferAst<l, $>> extends true
	? validateAst<l, $>
	: error<writeIndivisibleMessage<astToString<l>>>
```

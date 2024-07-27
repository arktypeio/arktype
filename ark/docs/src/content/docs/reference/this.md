---
title: this
sidebar:
  order: 6
---

add a "this" keyword resolvable from types without an associated scope alias

```ts
const disappointingGift = type({ label: "string", "box?": "this" })
const { out, errors } = disappointingGift(fetchGift())

// inferred as string | undefined
const chainable = out?.box?.box?.label

type DisappointingGift = typeof disappointingGift.infer
// equivalent to...
type ExplicitDisappointingGift = {
	label: string
	box?: ExplicitDisappointingGift
}
```

For similar behavior within a scoped definition, you should continue to reference the alias by name:

```ts
const types = scope({
	disappointingGift: {
		label: "string",
		// Resolves correctly to the root of the current type
		"box?": "disappointingGift"
	}
}).compile()
```

Attempting to reference "this" from within a scope will result in a ParseError:

```ts
const types = scope({
	disappointingGift: {
		label: "string",
		// Runtime and Type Error: "'this' is unresolvable"
		"box?": "this"
	}
}).compile()
```

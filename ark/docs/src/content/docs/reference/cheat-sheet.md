---
title: API cheat sheet
sidebar:
  order: 1
---

## Keywords

## Keywords

```ts
import { type } from "arktype"

export const currentTsSyntax = type({
	keyword: "null",
	stringLiteral: "'TS'",
	numberLiteral: "5",
	bigintLiteral: "5n",
	union: "string|number",
	intersection: "boolean&true",
	array: "Date[]",
	grouping: "(0|1)[]",
	objectLiteral: {
		nested: "string",
		"optional?": "number"
	},
	arrayOfObjectLiteral: [
		{
			name: "string"
		},
		"[]"
	],
	tuple: ["number", "number"],
	keyof: "keyof object",
	variadicTuples: ["true", "...", "false[]"],
	arrayOfObjectLiteralChained: type({ name: "string" }).array()
})
```

## Constraints

```ts
import { type } from "arktype"

// runtime-specific syntax and builtin keywords with great error messages

export const validationSyntax = type({
	keywords: "string.email | string.uuid | string.creditCard | number.integer", // and many more
	builtinParsers: "string.date.parse", // parses a Date from a string
	nativeRegexLiteral: /@arktype\.io/,
	embeddedRegexLiteral: "string.email & /@arktype\\.io/",
	divisibility: "number % 10", // a multiple of 10
	bound: "string.alpha > 10", // an alpha-only string with more than 10 characters
	range: "1 <= string.email[] < 100", // a list of 1 to 99 emails
	narrows: ["number", ":", n => n % 2 === 1], // an odd integer
	morphs: ["string", "=>", parseFloat] // validates a string input then parses it to a number
})

// root-level expressions

const intersected = type({ value: "string" }, "&", { format: "'bigint'" })

// chained expressions via .or, .and, .narrow, .pipe and much more
//  (these replace previous helper methods like union and intersection)

const user = type({
	name: "string",
	age: "number"
})

// type is fully introspectable and traversable
const parseUser = type("string").pipe(s => JSON.parse(s), user)

const maybeMe = parseUser('{ "name": "David" }')

if (maybeMe instanceof type.errors) {
	// "age must be a number (was missing)"
	console.log(maybeMe.summary)
}
```

## 2.0

<!--
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
``` -->

<!--
Date literals

Date literals can now be defined using the following syntax:

```ts
// single or double quoted string preceded by "d"
// enclosed string is passed to the Date constructor
const exactDate = type("d'2023-07-04'")
```

This is mostly useful in the context of ranges, where they can be applies as limits to a non-literal `Date` (normal rules about comparators and single/double bounds apply):

```ts
// a Date after 2000 but before 2010
const dateInRange = type("d'2000'<Date<=d'2010-1-1'")
```

Since what is enclosed by the date literal tokens is not parsed, you can also insert values dynamically, e.g.:

```ts
// a Date in the past
const  = type(`Date<=d"${Date.now()}"`)
``` -->

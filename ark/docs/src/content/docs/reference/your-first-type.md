---
title: Your first type
order: 1
---

Defining basic types in ArkType is just like TypeScript, so if you already know how to do that, congratulations! You already know most of ArkType's syntax 🎉

Every type you define is full auto-completed and validated as if it were being checked by your editor natively from within TypeScript's type system!

A huge amount of optimization has gone into the static parser to make this not just feasiable in terms of performance, but often much better. For example, types are about 3x as efficient as equivalent Zod on average.

For an ever better in-editor developer experience, try the [ArkDark VSCode extension](https://marketplace.visualstudio.com/items?itemName=arktypeio.arkdark) for syntax highlighting.

```ts
import { type } from "arktype"

// Definitions are statically parsed and inferred as TS.
export const user = type({
	name: "string",
	device: {
		platform: "'android'|'ios'",
		"version?": "number"
	}
})

// Validators return typed data or clear, customizable errors.
export const out = user({
	name: "Alan Turing",
	device: {
		// errors.summary: "device/platform must be 'android' or 'ios' (was 'enigma')"
		platform: "enigma"
	}
})

if (out instanceof type.errors) {
	// a clear, user-ready error message, even for complex unions and intersections
	console.log(out.summary)
} else {
	// your valid data!
	console.log(out)
}
```

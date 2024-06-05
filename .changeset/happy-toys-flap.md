---
"@arktype/schema": patch
---

Add a new `parseAsSchema` API that accepts `unknown` and returns either a `ParseError` or a Root schema instance with a castable parameter.

Useful for stuff like:

```ts
const s = schema("number")
const fromSerialized = parseAsSchema(s.json)
```

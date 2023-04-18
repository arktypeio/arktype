---
"arktype": patch
---

## fix array validation in strict and distilled modes

Previously, attempting to validate an array with "keys" set to "distilled" or "strict" would yield incorrect results.

Now, types like this behave as expected:

```ts
const strictArray = type("string[]", { keys: "strict" })
// data = ["foo", "bar"]
const { data, problems } = strictArray(["foo", "bar"])
```

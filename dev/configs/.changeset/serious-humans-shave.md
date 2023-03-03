---
"arktype": patch
---

add an "assert" utility to type instances that either directly returns valid data or throws a TypeError

```ts
const t = type("string")
// "foo"
const resultOne = t.assert("foo")
// Throws: TypeError: Must be a string (was number)
const resultTwo = t.assert(5)
```

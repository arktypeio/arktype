---
"arktype": patch
---

## remove String, Number, Boolean, Object and Array from the default jsObjects scope

These types are a footgun in TypeScript. You almost always want to use `string`, `number`, `boolean`, `object` or `unknown[]` instead. Particularly with the addition of autocomplete, we don't want to be confusing people by constantly suggesting `string` and `String`.

If you do want to use them, you can still define them like any other `"instanceof"` type:

```ts
const stringObject = type(["instanceof", String])
```

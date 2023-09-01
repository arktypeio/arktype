---
"arktype": patch
---

# Fixes a bug causing intersections including cross scope references to be inferred as `unknown`

Unfortunately, some cross-scope operations will still result in an error at runtime. You will know at build time if this occurs by a message in an intersection like "Unable to resolve alias 'myExternalAlias'". The workaround is to use the in-scope type parser as follows until next release for these scenarios:

Unions:

```ts
const $ = scope({
    a: "'abc'",
    b: { "c?": "a" }
})
const types = $.compile()
// This fails if you don't use scoped type for now, fixing in next release
const t = $.type([types.b, "|", { extraProp: "string" }])
```

Intersections:

```ts
const $ = scope({
    a: "'abc'",
    b: { "c?": "a" }
})
const types = $.compile()
// This fails if you don't use scoped type for now, fixing in next release
const t = $.type([types.b, "&", { extraProp: "string" }])
```

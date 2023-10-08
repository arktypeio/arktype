---
"arktype": patch
---

### Fix a bug inferring certain recursive unions.

Previously, a scoped type like this failed to infer correctly. Thanks to [@Vanilagy](https://github.com/Vanilagy) for the repro!

```ts
scope({
    a: {
        name: '"a"'
    },
    b: {
        name: '"b"',
        children: "(a|b)[]"
    }
})
```

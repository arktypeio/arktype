---
"arktype": patch
---

## allow a custom path to be specified when creating a problem using a string[]

Previously, creating a problem at a custom Path from a narrow function required importing the Path utility, which is not exposed through the main API entrypoint. This allows path to be specified as a simple string[], e.g.:

```ts
const abEqual = type([
    {
        a: "number",
        b: "number"
    },
    "=>",
    ({ a, b }, problems) => {
        if (a === b) {
            return true
        }
        problems.mustBe("equal to b", { path: ["a"] })
        problems.mustBe("equal to a", { path: ["b"] })
        return false
    }
])
```

Addresses https://github.com/arktypeio/arktype/issues/709.

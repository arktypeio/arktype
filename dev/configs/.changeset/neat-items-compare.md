---
"arktype": patch
---

Allow discrimination between common builtin classes

Previously, types like the following were incorrectly treated as non-discriminatable unions:

```ts
const arrayOrDate = type([["instanceof", Array], "|", ["instanceof", Date]])

attest(t.flat).snap([
    ["domain", "object"],
    // Whoops! Should have been a switch based on "class"
    [
        "branches",
        [[["class", "(function Array)"]], [["class", "(function Date)"]]]
    ]
])
```

Now, unions like these are correctly discriminated if they occur anywhere in the type:

```ts
const arrayOrDate = type([["instanceof", Array], "|", ["instanceof", Date]])

attest(t.flat).snap([
    ["domain", "object"],
    // Correctly able to determine which branch we are on in constant time
    ["switch", { path: [], kind: "class", cases: { Array: [], Date: [] } }]
])
```

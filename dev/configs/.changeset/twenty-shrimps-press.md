---
"arktype": patch
---

## add autocomplete for string definitions

Now, when you start typing a string definition, you'll see all valid completions for that definition based on the keywords in your current scope:

```ts
type({
    // suggests all built-in keywords (good way to see what's available!)
    name: ""
})

type({
    // suggests "string" | "semver" | "symbol"
    name: "s"
})

type({
    // suggests "string"
    name: "str",
    // suggests "number|undefined" | "number|unknown"
    age: "number|un"
})

scope({
    user: {
        name: "string",
        age: "number|undefined"
    },
    // suggests "user" | "undefined" | "unknown" | "uuid" | "uppercase"
    admin: "u"
})
```

Initially, I was hesitant to add funcitonality like this, because it sometimes leads to type errors like '"" is not assignable to ("string" | "number" | ...a bunch of keywords...)", which is significantly less clear than the previous message "'' is unresolvable."

That said, the DX was just too good to pass up. Try it out and let me know if you agree 🔥

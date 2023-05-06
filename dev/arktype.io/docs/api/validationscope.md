---
hide_table_of_contents: true
---

# validationScope

## text

```ts
validationScope: import("../../scope.js").Scope<
    [
        {
            alpha: string
            alphanumeric: string
            lowercase: string
            uppercase: string
            creditCard: string
            email: string
            uuid: string
            parsedNumber: (In: string) => number
            parsedInteger: (In: string) => number
            parsedDate: (In: string) => Date
            semver: string
            json: (In: string) => unknown
            integer: number
        },
        {},
        false
    ]
>
```

---
hide_table_of_contents: true
---

# arkScope

## text

```ts
arkScope: import("./scope.js").Scope<
    [
        {
            any: any
            bigint: bigint
            boolean: boolean
            false: false
            never: never
            null: null
            number: number
            object: object
            string: string
            symbol: symbol
            true: true
            unknown: unknown
            void: void
            undefined: undefined
            Function: (...args: any[]) => unknown
            Date: Date
            Error: Error
            Map: Map<unknown, unknown>
            RegExp: RegExp
            Set: Set<unknown>
            WeakMap: WeakMap<object, unknown>
            WeakSet: WeakSet<object>
            Promise: Promise<unknown>
            alpha: string
            alphanumeric: string
            lowercase: string
            uppercase: string
            creditCard: string
            email: string
            uuid: string
            parsedNumber: (In: string) => Out<number>
            parsedInteger: (In: string) => Out<number>
            parsedDate: (In: string) => Out<Date>
            semver: string
            json: (In: string) => Out<unknown>
            integer: number
        },
        {},
        false
    ]
>
```

---
hide_table_of_contents: true
---

# arkscope

## text

```ts
arkscope: import("./scope.js").Scope<
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
            Array: unknown[]
            Date: Date
            Error: Error
            Map: Map<unknown, unknown>
            RegExp: RegExp
            Set: Set<unknown>
            Object: {
                [x: string]: unknown
            }
            String: String
            Number: Number
            Boolean: Boolean
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

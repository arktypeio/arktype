---
hide_table_of_contents: true
---

# PrecompiledDefaults

## text

```ts
export type PrecompiledDefaults = {
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
    integer: number
    alpha: string
    alphanumeric: string
    lowercase: string
    uppercase: string
    creditCard: string
    email: string
    uuid: string
    semver: string
    json: (In: string) => unknown
    parsedNumber: (In: string) => number
    parsedInteger: (In: string) => number
    parsedDate: (In: string) => Date
    Function: (...args: any[]) => unknown
    Date: Date
    Error: Error
    Map: Map<unknown, unknown>
    RegExp: RegExp
    Set: Set<unknown>
    WeakMap: WeakMap<object, unknown>
    WeakSet: WeakSet<object>
    Promise: Promise<unknown>
}
```

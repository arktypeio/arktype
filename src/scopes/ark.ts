import type { Space } from "../scope.js"
import { scope } from "../scope.js"
import type { TypeParser } from "../type.js"
import { jsObjects, jsObjectsScope } from "./jsObjects.js"
import { tsKeywords, tsKeywordsScope } from "./tsKeywords.js"
import { validation, validationScope } from "./validation/validation.js"

export const arkScope = scope(
    {},
    {
        name: "standard",
        includes: [tsKeywords, jsObjects, validation],
        standard: false
    }
)

export const ark: Space<Ark> = arkScope.compile()

export const scopes = {
    tsKeywords: tsKeywordsScope,
    jsObjects: jsObjectsScope,
    validation: validationScope,
    ark: arkScope
}

export const spaces = {
    tsKeywords,
    jsObjects,
    validation,
    ark
} satisfies Record<Exclude<keyof typeof scopes, "root">, Space>

// This is just copied from the inference of defaultScope. Creating an explicit
// type like this makes validation for the default type and scope functions feel
// significantly more responsive.
export type Ark = {
    // tsKeywords
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
    // validation
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
    // jsObjects
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

export const type: TypeParser<Ark> = arkScope.type

const z = type({ a: "string" })
    .and({ b: "number" })
    .morph(({ a, b }) => ({ b: a, a: b }))
    .filter((data): data is { a: "foo"; b: number } => data.a === "foo")

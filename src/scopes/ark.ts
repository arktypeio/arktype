import { registry } from "../nodes/registry.js"
import type { Out } from "../parse/ast/morph.js"
import type { ScopeParser, Space } from "../scope.js"
import { RootScope } from "../scope.js"
import type { TypeParser } from "../type.js"
import { jsObjects, jsObjectsScope } from "./jsObjects.js"
import { tsKeywords, tsKeywordsScope } from "./tsKeywords.js"
import { validation, validationScope } from "./validation/validation.js"

export const arkScope = RootScope.scope({
    ...tsKeywords,
    ...jsObjects,
    ...validation
})

export const ark: Space<Ark> = arkScope.compile()

registry().register("ark", ark)

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
    json: (In: string) => Out<unknown>
    parsedNumber: (In: string) => Out<number>
    parsedInteger: (In: string) => Out<number>
    parsedDate: (In: string) => Out<Date>
    // jsObjects
    Function: Function
    Date: Date
    Error: Error
    Map: Map<unknown, unknown>
    RegExp: RegExp
    Set: Set<unknown>
    WeakMap: WeakMap<object, unknown>
    WeakSet: WeakSet<object>
    Promise: Promise<unknown>
}

export const scope: ScopeParser<{}, Ark> = arkScope.scope as never

export const type: TypeParser<Ark> = arkScope.type

// import { scope } from "arktype"

// export const tt = scope({
//     a: {
//         type: "a",
//         data: {
//             id: "number"
//         }
//     },
//     b: {
//         type: "b",
//         data: {
//             id: "string"
//         }
//     },
//     type: "a|b"
// }).compile()

// // Get validated data or clear, customizable error messages.
// export const { data, problems } = tt.type({
//     type: "a",
//     data: {
//         id: 2
//     }
// })

// // "contributors must be more than 1 items long (was 1)"
// console.log(problems, data)

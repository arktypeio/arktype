import { registry } from "../nodes/registry.js"
import type { Out } from "../parse/ast/morph.js"
import type { ScopeParser, Space } from "../scope.js"
import { RootScope } from "../scope.js"
import type { Type, TypeParser } from "../type.js"
import { jsObjects, jsObjectsScope } from "./jsObjects.js"
import { tsKeywords, tsKeywordsScope } from "./tsKeywords.js"
import { validation, validationScope } from "./validation/validation.js"

export const arkScope = RootScope.scope({
    ...tsKeywords,
    ...jsObjects,
    ...validation
})

export const ark: Ark = arkScope.compile()

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
    any: Type<any>
    bigint: Type<bigint>
    boolean: Type<boolean>
    false: Type<false>
    never: Type<never>
    null: Type<null>
    number: Type<number>
    object: Type<object>
    string: Type<string>
    symbol: Type<symbol>
    true: Type<true>
    unknown: Type<unknown>
    void: Type<void>
    undefined: Type<undefined>
    // validation
    integer: Type<number>
    alpha: Type<string>
    alphanumeric: Type<string>
    lowercase: Type<string>
    uppercase: Type<string>
    creditCard: Type<string>
    email: Type<string>
    uuid: Type<string>
    semver: Type<string>
    json: Type<(In: string) => Out<unknown>>
    parsedNumber: Type<(In: string) => Out<number>>
    parsedInteger: Type<(In: string) => Out<number>>
    parsedDate: Type<(In: string) => Out<Date>>
    // jsObjects
    Function: Type<Function>
    Date: Type<Date>
    Error: Type<Error>
    Map: Type<Map<unknown, unknown>>
    RegExp: Type<RegExp>
    Set: Type<Set<unknown>>
    WeakMap: Type<WeakMap<object, unknown>>
    WeakSet: Type<WeakSet<object>>
    Promise: Type<Promise<unknown>>
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

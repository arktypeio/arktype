import { registry } from "../nodes/registry.js"
import type { Out } from "../parse/ast/morph.js"
import type { ScopeParser, Space } from "../scope.js"
import { Scope } from "../scope.js"
import type { TypeParser } from "../type.js"
import { jsObject, jsObjectTypes } from "./jsObjects.js"
import { tsKeyword, tsKeywordTypes } from "./tsKeywords.js"
import { validation, validationTypes } from "./validation/validation.js"

export const ark = Scope.root({
    ...tsKeywordTypes,
    ...jsObjectTypes,
    ...validationTypes
})

// TODO: fix never inference
//  ark.infer.never

registry().register("ark", ark)

export const arktypes: Space<Ark, {}, {}> = ark.compile()

export const scopes = {
    tsKeyword,
    jsObject,
    validation,
    ark
}

export const spaces = {
    tsKeyword: tsKeywordTypes,
    jsObject: jsObjectTypes,
    validation: validationTypes,
    ark: arktypes
} satisfies Record<Exclude<keyof typeof scopes, "root">, Space>

// This is just copied from the inference of the default scope. Creating an explicit
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

export const scope: ScopeParser<{}, Ark> = ark.scope as never

export const type: TypeParser<Ark> = ark.type

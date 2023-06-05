import { registry } from "../nodes/registry.js"
import type { Out } from "../parse/ast/morph.js"
import type { ScopeParser, TypeSet } from "../scope.js"
import { Scope } from "../scope.js"
import type { DefinitionParser, TypeParser } from "../type.js"
import { jsObjectTypes } from "./jsObjects.js"
import { tsKeywordTypes } from "./tsKeywords.js"
import { validationTypes } from "./validation/validation.js"

// TODO: figure out a more elegant way to export and make ambient simultaneously
export const ark = Scope.root({
    ...tsKeywordTypes,
    ...jsObjectTypes,
    ...validationTypes
})

// TODO: fix never inference
//  ark.infer.never

registry().register("ark", ark)

export const arktypes: TypeSet<{ exports: Ark; locals: {}; ambient: {} }> =
    ark.export()

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

export const arkAmbient = Scope.root(ark.ambient())

export const scope: ScopeParser<{}, Ark> = arkAmbient.scope as never

export const type: TypeParser<Ark> = ark.type

export const define: DefinitionParser<Ark> = ark.define

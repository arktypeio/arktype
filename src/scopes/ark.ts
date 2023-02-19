import type { InferredObjectKinds } from "../utils/objectKinds.ts"
import { jsObjects, jsObjectsScope } from "./jsObjects.ts"
import type { Space } from "./scope.ts"
import { rootScope, scope } from "./scope.ts"
import { tsKeywords, tsKeywordsScope } from "./tsKeywords.ts"
import type { TypeParser } from "./type.ts"
import { validation, validationScope } from "./validation/validation.ts"

export const arkscope = scope(
    {},
    {
        name: "standard",
        includes: [tsKeywords, jsObjects, validation],
        standard: false
    }
)

export const ark: Space<PrecompiledDefaults> = arkscope.compile()

export const scopes = {
    root: rootScope,
    tsKeywords: tsKeywordsScope,
    jsObjects: jsObjectsScope,
    validation: validationScope,
    ark: arkscope
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
export type PrecompiledDefaults = {
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
    // jsObects
} & InferredObjectKinds

export const type: TypeParser<PrecompiledDefaults> = arkscope.type

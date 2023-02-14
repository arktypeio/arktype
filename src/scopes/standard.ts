import type { Out } from "../parse/ast/morph.ts"
import type { extend } from "../utils/generics.ts"
import type { InferredObjectKinds } from "../utils/objectKinds.ts"
import { jsObjects, jsObjectsScope } from "./jsObjects.ts"
import type { Space } from "./scope.ts"
import { emptyScope, scope } from "./scope.ts"
import { tsKeywords, tsKeywordsScope } from "./tsKeywords.ts"
import type { TypeParser } from "./type.ts"
import { validation, validationScope } from "./validation/validation.ts"

export const standardScope = scope(
    {},
    {
        name: "standard",
        includes: [tsKeywords, jsObjects, validation],
        standard: false
    }
)

export const standard = standardScope.compile()

export const scopes = {
    empty: emptyScope,
    tsKeywords: tsKeywordsScope,
    jsObjects: jsObjectsScope,
    validation: validationScope,
    standard: standardScope
}

export const spaces = {
    tsKeywords,
    jsObjects,
    validation,
    standard
} satisfies Record<Exclude<keyof typeof scopes, "empty">, Space>

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
    parsedNumber: (In: string) => Out<number>
    parsedInteger: (In: string) => Out<number>
    parsedDate: (In: string) => Out<Date>
    // jsObects
} & InferredObjectKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ValidateStandardScope = [
    // if PrecompiledDefaults gets out of sync with scopes.standard, there will be a type error here
    extend<PrecompiledDefaults, typeof scopes["standard"]["infer"]>,
    extend<typeof scopes["standard"]["infer"], PrecompiledDefaults>
]

export const type: TypeParser<PrecompiledDefaults> = scopes.standard.type

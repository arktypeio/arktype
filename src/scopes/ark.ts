import type { ScopeParser, TypeSet } from "../scope.js"
import { Scope } from "../scope.js"
import type {
    DeclarationParser,
    DefinitionParser,
    TypeParser
} from "../type.js"
import type { InferredJsObjects } from "./jsObjects.js"
import { jsObjectTypes } from "./jsObjects.js"
import type { InferredTsGenerics } from "./tsGenerics.js"
import type { InferredTsKeywords } from "./tsKeywords.js"
import { tsKeywordTypes } from "./tsKeywords.js"
import type { InferredValidation } from "./validation/validation.js"
import { validationTypes } from "./validation/validation.js"
// import { tsGenericTypes } from "./tsGenerics.js"

export type ArkResolutions = { exports: Ark; locals: {}; ambient: Ark }

export const ark: Scope<ArkResolutions> = Scope.root({
    ...tsKeywordTypes,
    ...jsObjectTypes,
    ...validationTypes
    // ...tsGenericTypes
    // // again, unfortunately TS won't handle comparing generics well here, so we
    // // have to cast. that said, since each individual root scope is checked,
    // // this is low risk
}).toAmbient() as never

export const arktypes: TypeSet<ArkResolutions> = ark.export()

// using a mapped type like this is much more efficient than an intersection
// here the purpose of this type, which is redundant with the inferred
// definition of ark, is to allow types derived from the default scope to be
// calulated more efficiently
export type Ark = {
    [k in
        | keyof InferredTsKeywords
        | keyof InferredJsObjects
        | keyof InferredValidation
        | keyof InferredTsGenerics]: k extends keyof InferredTsKeywords
        ? InferredTsKeywords[k]
        : k extends keyof InferredJsObjects
        ? InferredJsObjects[k]
        : k extends keyof InferredValidation
        ? InferredValidation[k]
        : k extends keyof InferredTsGenerics
        ? InferredTsGenerics[k]
        : never
}

export const scope: ScopeParser<{}, Ark> = ark.scope as never

export const type: TypeParser<Ark> = ark.type

export const define: DefinitionParser<Ark> = ark.define

export const declare: DeclarationParser<Ark> = ark.declare

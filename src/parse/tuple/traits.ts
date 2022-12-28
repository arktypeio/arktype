// import type { Identifier } from "../../nodes/node.ts"
// import type { conform } from "../../utils/generics.ts"
// import type {
//     inferDefinition,
//     InferenceContext,
//     validateDefinition
// } from "../definition.ts"
// import { parseDefinition } from "../definition.ts"
// import type { TupleExpressionParser } from "./tuple.ts"

// export type Traits<T, c extends InferenceContext> = {
//     in?: {
//         [name in Identifier<c["scope"]>]?: (data: inferDefinition<name, c>) => T
//     }
//     out?: {
//         [name in Identifier<c["scope"]>]?: (data: T) => inferDefinition<name, c>
//     }
// }

// export const parseTraitsTuple: TupleExpressionParser<":"> = (def, scope) =>
//     parseDefinition(def[0], scope)

// export type TraitsTuple = [unknown, ":", unknown]

// export type inferTraitsTuple<
//     def extends TraitsTuple,
//     c extends InferenceContext
// > = inferDefinition<def[0], c>

// export type validateTraitsTuple<
//     def extends TraitsTuple,
//     c extends InferenceContext
// > = [
//     validateDefinition<def[0], c>,
//     ":",
//     validateTraitsTuple<def[2], inferDefinition<def[2], c>, c>
// ]

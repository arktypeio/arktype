import type { ElementOf, UnionToTuple } from "@re-/tools"
import type { Branching } from "../../expression/branching/branching.js"

import type { Expression } from "../../expression/expression.js"

export type ReferencesOf<Ast, By extends string = string> = Filter<
    References<Ast>,
    By
>

// For extracting references, we only care about the node at index 0
// TODO: Fix?
type UnaryTypedToken = Expression.PostfixToken | Expression.ConstraintToken

type References<Ast> = Ast extends string
    ? [Ast]
    : Ast extends readonly unknown[]
    ? Ast[1] extends UnaryTypedToken
        ? References<Ast[0]>
        : Ast[1] extends Branching.Token
        ? [...References<Ast[0]>, ...References<Ast[2]>]
        : StructuralReferences<Ast>
    : StructuralReferences<Ast>

type StructuralReferences<Ast> = CollectStructuralReferences<
    Ast extends readonly unknown[] ? Ast : UnionToTuple<Ast[keyof Ast]>,
    []
>

type CollectStructuralReferences<
    Children extends readonly unknown[],
    Result extends readonly unknown[]
> = Children extends [infer Head, ...infer Tail]
    ? CollectStructuralReferences<Tail, [...Result, ...References<Head>]>
    : Result

export type ReferenceTypeOptions<Filter extends string = string> = {
    filter?: Filter
}

type Filter<Arr extends string[], By extends string> = FilterRecurse<
    Arr,
    By,
    []
>

type FilterRecurse<
    References extends unknown[],
    By extends string,
    Result extends string[]
> = References extends [infer Head, ...infer Tail]
    ? FilterRecurse<
          Tail,
          By,
          Head extends By
              ? Head extends ElementOf<Result>
                  ? Result
                  : [...Result, Head]
              : Result
      >
    : Result

// import { assert } from "@re-/assert"
// import type { ElementOf } from "@re-/tools"
// import { isNumeric, narrow } from "@re-/tools"
// import { describe, test } from "mocha"
// import { space, type } from "../../api.js"

// describe("references", () => {
//     const objectDef = narrow({
//         strings: {
//             keyword: "boolean",
//             expression: "string[]|integer?"
//         },
//         listed: ["-1n", "null", "string|boolean"],
//         regex: `/.*/`
//     })

//     const expectedObjectDefReferences = narrow([
//         "/.*/",
//         "-1n",
//         "null",
//         "string",
//         "boolean",
//         "integer"
//     ])

//     type ExpectedObjectDefReferenceTuple = typeof expectedObjectDefReferences

//     type ExpectedObjectDefReferenceUnion =
//         ElementOf<ExpectedObjectDefReferenceTuple>

//     type ExpectedObjectDefReferenceList = ExpectedObjectDefReferenceUnion[]

//     describe("model", () => {
//         test("from string", () => {
//             const references = space({ user: "unknown", group: "unknown" })
//                 .$.type("0<(user[]|group[]|boolean&true|integer|null)[]<2")
//                 .references()
//             const expectedReferenceSet = narrow([
//                 "user",
//                 "group",
//                 "boolean",
//                 "true",
//                 "integer",
//                 "null"
//             ])
//             type ExpectedReferences = ElementOf<typeof expectedReferenceSet>[]
//             assert(references).equals(expectedReferenceSet, {
//                 listComparison: "permutable"
//             }).typed as ExpectedReferences
//         })
//         test("from string with duplicates", () => {
//             const zeroAndOne = type("0|1|0[]|1[]|0[][]|1[][]?").references()
//             assert(zeroAndOne).equals(["0", "1"]).typed as ("0" | "1")[]
//         })
//         test("from object", () => {
//             const references = type(objectDef).references()
//             assert(references).equals(expectedObjectDefReferences, {
//                 listComparison: "permutable"
//             }).typed as ExpectedObjectDefReferenceList
//         })
//         test("filter", () => {
//             const referencesIncludingE = type(objectDef).references({
//                 filter: (reference) => reference.includes("e")
//             })
//             assert(referencesIncludingE).equals(["integer", "boolean"], {
//                 listComparison: "permutable"
//             }).typed as ExpectedObjectDefReferenceList
//         })
//         test("typed filter", () => {
//             const bigintLiteralReferences = type(objectDef).references({
//                 filter: (reference): reference is `${number}n` =>
//                     isNumeric(reference.slice(0, -1)) &&
//                     reference.slice(-1) === "n"
//             })
//             assert(bigintLiteralReferences).equals(["-1n"], {
//                 listComparison: "permutable"
//             }).typed as "-1n"[]
//         })
//     })
// })

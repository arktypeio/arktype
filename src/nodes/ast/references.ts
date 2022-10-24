import type { Conform } from "../../utils/generics.js"
import type { Branching } from "../expression/branching/branching.js"
import type { Infix } from "../expression/infix/infix.js"
import type { Postfix } from "../expression/postfix/postfix.js"
import type { NumberLiteral } from "../terminal/literal/number.js"

type SingleChildToken = Postfix.Token | Infix.Token

type References<Ast, Filter extends string = string> = Ast extends string
    ? [Ast]
    : Ast extends readonly unknown[]
    ? Ast[1] extends SingleChildToken
        ? Ast[0] extends NumberLiteral.Definition
            ? // If it's a left bound, the child is on the right
              References<Ast[2]>
            : References<Ast[0]>
        : Ast[1] extends Branching.Token
        ? [...References<Ast[0], Filter>, ...References<Ast[2], Filter>]
        : StructuralReferences<Ast, Filter>
    : StructuralReferences<Ast, Filter>

type StructuralReferences<
    Ast,
    Filter extends string
> = CollectStructuralReferences<
    Ast extends readonly unknown[] ? Ast : UnionToTuple<Ast[keyof Ast]>,
    [],
    Filter
>

type CollectStructuralReferences<
    Children extends readonly unknown[],
    Result extends readonly unknown[],
    Filter extends string
> = Children extends [infer Head, ...infer Tail]
    ? CollectStructuralReferences<
          Tail,
          [...Result, ...References<Head>],
          Filter
      >
    : Result

type IntersectionOf<Union> = (
    Union extends unknown ? (_: Union) => void : never
) extends (_: infer Intersection) => void
    ? Intersection
    : never

type GetLastUnionMember<T> = IntersectionOf<
    T extends unknown ? (t: T) => void : never
> extends (t: infer Next) => void
    ? Next
    : never

type UnionToTupleRecurse<
    Union,
    Result extends unknown[],
    Current = GetLastUnionMember<Union>
> = [Union] extends [never]
    ? Result
    : UnionToTupleRecurse<Exclude<Union, Current>, [Current, ...Result]>

type UnionToTuple<Union> = UnionToTupleRecurse<Union, []> extends infer X
    ? Conform<X, Union[]>
    : never

// import { assert } from "#testing"
// import type { ElementOf } from "@arktype/tools"
// import { isNumeric, narrow } from "@arktype/tools"
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

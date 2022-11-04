import type { conform } from "../internal.js"
import type { NumberLiteral } from "../parse/operand/numeric.js"
import type { Scanner } from "../parse/state/scanner.js"

type SingleChildToken = Scanner.UnaryToken | Scanner.Comparator | "%"

type references<node, filter extends string = string> = node extends string
    ? [node]
    : node extends readonly unknown[]
    ? node[1] extends SingleChildToken
        ? node[0] extends NumberLiteral
            ? // If it's a left bound, the child is on the right
              references<node[2]>
            : references<node[0]>
        : node[1] extends Scanner.NaryToken
        ? [...references<node[0], filter>, ...references<node[2], filter>]
        : structuralReferences<node, filter>
    : structuralReferences<node, filter>

type structuralReferences<
    Ast,
    Filter extends string
> = collectStructuralReferences<
    Ast extends readonly unknown[] ? Ast : unionToTuple<Ast[keyof Ast]>,
    [],
    Filter
>

type collectStructuralReferences<
    Children extends readonly unknown[],
    Result extends readonly unknown[],
    Filter extends string
> = Children extends [infer Head, ...infer Tail]
    ? collectStructuralReferences<
          Tail,
          [...Result, ...references<Head>],
          Filter
      >
    : Result

type intersectionOf<union> = (
    union extends unknown ? (_: union) => void : never
) extends (_: infer Intersection) => void
    ? Intersection
    : never

type getLastUnionMember<union> = intersectionOf<
    union extends unknown ? (t: union) => void : never
> extends (t: infer Next) => void
    ? Next
    : never

type unionToTupleRecurse<
    union,
    result extends unknown[],
    current = getLastUnionMember<union>
> = [union] extends [never]
    ? result
    : unionToTupleRecurse<Exclude<union, current>, [current, ...result]>

type unionToTuple<union> = unionToTupleRecurse<union, []> extends infer X
    ? conform<X, union[]>
    : never

// import { attest } from "@artkype/test"
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

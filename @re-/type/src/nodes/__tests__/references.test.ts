// import { assert } from "@re-/assert"
// import type { ElementOf, Evaluate } from "@re-/tools"
// import { isNumeric, narrow } from "@re-/tools"
// import { describe, test } from "mocha"
// import type { ReferencesOf } from "../../index.js"
// import { space, type } from "../../index.js"

// describe("references", () => {
//     const objectDef = narrow({
//         strings: {
//             keyword: "boolean",
//             expression: "string[]|integer?"
//         },
//         listed: ["-1n", "null", "string|boolean"],
//         regex: `/.*/`
//     })

//     type ObjectDef = typeof objectDef

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
//                 .$root.type("0<(user[]|group[]|boolean&true|integer|null)[]<2")
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
//         test("from object with preserveStructure", () => {
//             const references = type(objectDef).references({
//                 preserveStructure: true
//             })
//             const expectedReferenceSets = narrow({
//                 strings: {
//                     keyword: ["boolean"],
//                     expression: ["string", "integer"]
//                 },
//                 listed: [["-1n"], ["null"], ["string", "boolean"]],
//                 regex: ["/.*/"]
//             })
//             type ExtractExpectedReferences<T> = Evaluate<{
//                 [K in keyof T]: T[K] extends string[]
//                     ? ElementOf<T[K]>[]
//                     : ExtractExpectedReferences<T[K]>
//             }>
//             type ExpectedReferences = ExtractExpectedReferences<
//                 typeof expectedReferenceSets
//             >
//             assert(references).equals(expectedReferenceSets, {
//                 listComparison: "permutable"
//             }).typed as ExpectedReferences
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
//         test("filtered structured", () => {
//             const mySpace = space({
//                 a: "any",
//                 b: "boolean",
//                 c: {
//                     its: "'as'",
//                     easyAs: ["a|string", "a|b|boolean", "a|b|c|never"]
//                 }
//             })
//             type Dictionary = typeof mySpace.$root.definitions
//             const references = mySpace.c.references({
//                 preserveStructure: true,
//                 filter: (reference): reference is keyof Dictionary =>
//                     reference in mySpace.$root.definitions
//             })
//             assert(references).equals(
//                 {
//                     its: [],
//                     easyAs: [["a"], ["a", "b"], ["a", "b", "c"]]
//                 },
//                 { listComparison: "permutable" }
//             ).typed as {
//                 its: never[]
//                 easyAs: ["a"[], ("a" | "b")[], ("a" | "b" | "c")[]]
//             }
//         })
//     })
//     describe("type", () => {
//         describe("format", () => {
//             test("default (array)", () => {
//                 const actual = {} as ReferencesOf<ObjectDef, {}>
//                 assert(actual).typed as ExpectedObjectDefReferenceList
//             })
//             test("tuple", () => {
//                 const actual = {} as ReferencesOf<
//                     "string|number[]|boolean&true?",
//                     {},
//                     { format: "tuple" }
//                 >
//                 assert(actual).typed as ["string", "number", "boolean", "true"]
//             })
//             test("union", () => {
//                 const actual = {} as ReferencesOf<
//                     ObjectDef,
//                     {},
//                     { format: "union" }
//                 >
//                 assert(actual).typed as ExpectedObjectDefReferenceUnion
//             })
//         })
//         test("filters", () => {
//             const referencesContainingI = {} as ReferencesOf<
//                 ObjectDef,
//                 {},
//                 { filter: `${string}i${string}`; format: "union" }
//             >
//             assert(referencesContainingI).typed as "string" | "integer"
//         })
//     })
// })

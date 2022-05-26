import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("resolutions", () => {
    it("disabled", () => {
        assert(model("true").type).typed as true
    })
})
/*
 * import { assert } from "@re-/assert"
 * import { diffSets } from "@re-/tools"
 * import { create } from "@re-/model"
 * import { ReferencesOf } from "../../model.js"
 */

/*
 * describe("references", () => {
 *     describe("type", () => {
 *         it("primitive", () => {
 *             let placeholder: any
 *             assert(placeholder as ReferencesOf<null>).typed as "null"
 *             assert(placeholder as ReferencesOf<undefined>).typed as "undefined"
 *             assert(placeholder as ReferencesOf<5>).typed as "5"
 *             assert(placeholder as ReferencesOf<7n>).typed as "7n"
 *             assert(placeholder as ReferencesOf<true>).typed as "true"
 *             assert(placeholder as ReferencesOf<false>).typed as "false"
 *         })
 *         it("string", () => {
 *             const references = {} as ReferencesOf<
 *                 "(user[],group[])=>boolean|number|null",
 *                 { user: "any"; group: "any" }
 *             >
 *             assert(references).typed as
 *                 | "number"
 *                 | "boolean"
 *                 | "group"
 *                 | "user"
 *                 | "null"
 */

/*
 *             const listedFilteredReferences = {} as ReferencesOf<
 *                 "(user[],group[])=>boolean|number|null",
 *                 { user: "any"; group: "any" },
 *                 { asTuple: true; filter: `${string}${"o"}${string}` }
 *             >
 *             assert(listedFilteredReferences).typed as ["boolean", "group"]
 *         })
 *         it("object", () => {
 *             const refs = {} as ReferencesOf<
 *                 {
 *                     listed: ["group|null", "user|null"]
 *                     a: { b: { c: "user[]?" } }
 *                 },
 *                 { user: "any"; group: "any" }
 *             >
 *             assert(refs).typed as {
 *                 listed: ["group" | "null", "null" | "user"]
 *                 a: {
 *                     b: {
 *                         c: "user"
 *                     }
 *                 }
 *             }
 *         })
 *     })
 */

/*
 *     describe("value", () => {
 *         it("shallow", () => {
 *             assert(create(5).references()).equals(["5"]).typed as "5"[]
 *             assert(create(null).references()).equals(["null"]).typed as "null"[]
 *             assert(create(0n).references()).equals(["0n"]).typed as "0n"[]
 *             assert(create("string").references()).equals(["string"])
 *                 .typed as "string"[]
 */

/*
 *             const expressionReferences = create(
 *                 "string|number[]|null&true"
 *             ).references()
 *             assert(
 *                 diffSets(expressionReferences, [
 *                     "string",
 *                     "number",
 *                     "true",
 *                     "null"
 *                 ]) as any
 *             ).is(undefined)
 *             assert(expressionReferences).typed as (
 *                 | "string"
 *                 | "number"
 *                 | "true"
 *                 | "null"
 *             )[]
 *             const aliasReferences = create("user|string", {
 *                 space: { dictionary: { user: "any" } }
 *             }).references()
 *             assert(diffSets(["string", "user"], aliasReferences) as any).is(
 *                 undefined
 *             )
 *             assert(aliasReferences).typed as ("string" | "user")[]
 *         })
 *         it("object", () => {
 *             const objectReferences = create(
 *                 {
 *                     primitives: {
 *                         undefined: undefined,
 *                         null: null,
 *                         true: true,
 *                         false: false,
 *                         5: 5,
 *                         bigint: 7n
 *                     },
 *                     strings: {
 *                         keyword: "boolean",
 *                         expression: "string[]|number|null&custom?"
 *                     },
 *                     listed: [-1n, "null", "string|boolean"]
 *                 },
 *                 { space: { dictionary: { custom: "any" } } }
 *             ).references()
 *             assert(objectReferences).equals({
 *                 primitives: {
 *                     undefined: ["undefined"],
 *                     null: ["null"],
 *                     true: ["true"],
 *                     false: ["false"],
 *                     5: ["5"],
 *                     bigint: ["7n"]
 *                 },
 *                 strings: {
 *                     keyword: ["boolean"],
 *                     expression: ["string", "number", "null", "custom"]
 *                 },
 *                 listed: [["-1n"], ["null"], ["string", "boolean"]]
 *             })
 *             assert(objectReferences)
 *                 .type.toString()
 *                 .snap(
 *                     `"{ primitives: { undefined: \\"undefined\\"[]; null: \\"null\\"[]; true: \\"true\\"[]; false: \\"false\\"[]; 5: \\"5\\"[]; bigint: \\"7n\\"[]; }; strings: { keyword: \\"boolean\\"[]; expression: (\\"string\\" | \\"number\\" | \\"null\\" | \\"custom\\")[]; }; listed: [\\"-1n\\"[], \\"null\\"[], (\\"string\\" | \\"boolean\\")[]]; }"`
 *                 )
 *         })
 *     })
 * })
 */

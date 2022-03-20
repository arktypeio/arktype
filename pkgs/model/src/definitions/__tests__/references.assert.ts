import { assert } from "@re-/assert"
import { diffSets } from "@re-/tools"
import { define, ReferencesOf } from "@re-/model"

describe("references", () => {
    describe("type", () => {
        test("primitive", () => {
            let placeholder: any
            assert(placeholder as ReferencesOf<null>).typed as "null"
            assert(placeholder as ReferencesOf<undefined>).typed as "undefined"
            assert(placeholder as ReferencesOf<5>).typed as "5"
            assert(placeholder as ReferencesOf<7n>).typed as "7n"
            assert(placeholder as ReferencesOf<true>).typed as "true"
            assert(placeholder as ReferencesOf<false>).typed as "false"
        })
        test("string", () => {
            const references =
                {} as ReferencesOf<"(user[],group[])=>boolean|number|null">
            assert(references).typed as
                | "number"
                | "boolean"
                | "null"
                | "user"
                | "group"

            const listedFilteredReferences = {} as ReferencesOf<
                "(user[],group[])=>boolean|number|null",
                { asList: true; filter: `${string}${"o"}${string}` }
            >
            assert(listedFilteredReferences).typed as ["boolean", "group"]
        })
        test("object", () => {
            const refs = {} as ReferencesOf<{
                listed: ["group|null", "user|null"]
                a: { b: { c: "user[]?" } }
            }>
            assert(refs).typed as {
                listed: ["group" | "null", "user" | "null"]
                a: {
                    b: {
                        c: "user"
                    }
                }
            }
        })
    })

    describe("value", () => {
        test("shallow", () => {
            assert(define(5).references()).equals(["5"]).typed as ["5"]
            assert(define(null).references()).equals(["null"]).typed as ["null"]
            assert(define(0n).references()).equals(["0n"]).typed as ["0n"]
            assert(define("string").references()).equals(["string"]).typed as [
                "string"
            ]
            const expressionReferences = define(
                "(string,number[])=>null|true"
            ).references()
            assert(
                diffSets(expressionReferences, [
                    "string",
                    "number",
                    "true",
                    "null"
                ]) as any
            ).is(undefined)
            assert(expressionReferences).typed as (
                | "string"
                | "number"
                | "true"
                | "null"
            )[]
            const aliasReferences = define("user|string", {
                space: { user: "any" }
            }).references()
            assert(diffSets(["string", "user"], aliasReferences) as any).is(
                undefined
            )
            assert(aliasReferences).typed as ("string" | "user")[]
        })
        test("object", () => {
            const objectReferences = define(
                {
                    primitives: {
                        undefined: undefined,
                        null: null,
                        true: true,
                        false: false,
                        5: 5,
                        bigint: 7n
                    },
                    strings: {
                        keyword: "boolean",
                        expression: "(string[],number|null)=>custom"
                    },
                    listed: [-1n, "null", "string|boolean"]
                },
                { space: { custom: "any" } }
            ).references()
            assert(objectReferences).equals({
                primitives: {
                    undefined: ["undefined"],
                    null: ["null"],
                    true: ["true"],
                    false: ["false"],
                    5: ["5"],
                    bigint: ["7n"]
                },
                strings: {
                    keyword: ["boolean"],
                    expression: ["string", "number", "null", "custom"]
                },
                listed: [["-1n"], ["null"], ["string", "boolean"]]
            })
            assert(objectReferences)
                .type.toString()
                .snap(
                    `"{ primitives: { undefined: [\\"undefined\\"]; null: [\\"null\\"]; true: [\\"true\\"]; false: [\\"false\\"]; 5: [\\"5\\"]; bigint: [\\"7n\\"]; }; strings: { keyword: [\\"boolean\\"]; expression: (\\"string\\" | \\"number\\" | \\"null\\" | \\"custom\\")[]; }; listed: [[\\"-1n\\"], [\\"null\\"], (\\"string\\" | \\"boolean\\")[]]; }"`
                )
        })
    })
})

import { assert } from "@re-/assert"
import { diffSets } from "@re-/tools"
import { model, References, space } from "../src/index.js"

describe("references", () => {
    describe("type", () => {
        it("primitive", () => {
            let placeholder: any
            assert(placeholder as References<null>).typed as "null"
            assert(placeholder as References<undefined>).typed as "undefined"
            assert(placeholder as References<5>).typed as "5"
            assert(placeholder as References<7n>).typed as "7n"
            assert(placeholder as References<true>).typed as "true"
            assert(placeholder as References<false>).typed as "false"
        })
        it("string", () => {
            type ComplexStringType =
                "user[]|group[]|boolean&true|number&integer&positive|null"
            const references = {} as References<ComplexStringType>
            assert(references).typed as [
                "user",
                "group",
                "boolean",
                "true",
                "number",
                "integer",
                "positive",
                "null"
            ]
            const listedFilteredReferences = {} as References<
                ComplexStringType,
                `${string}o${string}`
            >
            assert(listedFilteredReferences).typed as [
                "group",
                "boolean",
                "positive"
            ]
        })
        it("object", () => {
            const refs = {} as References<{
                listed: ["group|null", "user|null"]
                a: { b: { c: "user[]?" } }
            }>
            assert(refs).typed as {
                listed: ["group" | "null", "null" | "user"]
                a: {
                    b: {
                        c: "user"
                    }
                }
            }
        })
    })
    describe("value", () => {
        it("shallow", () => {
            assert(model(5).references()).equals(["5"]).typed as "5"[]
            assert(model(null).references()).equals(["null"]).typed as "null"[]
            assert(model(0n).references()).equals(["0n"]).typed as "0n"[]
            assert(model("string").references()).equals(["string"])
                .typed as "string"[]
            const expressionReferences = model(
                "string|number[]|null|true?"
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
            const aliasReferences = space({ user: "any" })
                .create("user|string")
                .references()
            assert(diffSets(["string", "user"], aliasReferences) as any).is(
                undefined
            )
            assert(aliasReferences).typed as ("string" | "user")[]
        })
        it("object", () => {
            const objectReferences = model({
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
                    expression: "string[]|integer&positive|null"
                },
                listed: [-1n, "null", "string|boolean"]
            }).references({ preserveStructure: true })
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
                    expression: ["string", "integer", "positive", "null"]
                },
                listed: [["-1n"], ["null"], ["string", "boolean"]]
            })
            assert(objectReferences).type.toString.snap()
        })
    })
})

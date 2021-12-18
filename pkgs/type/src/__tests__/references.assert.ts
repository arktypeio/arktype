import { assert } from "@re-/assert"
import { diffSets, narrow } from "@re-/utils"
import { parse, References } from ".."

let placeholder: any

describe("references from type", () => {
    test("primitive", () => {
        assert(placeholder as References<null>).typed as "null"
        assert(placeholder as References<undefined>).typed as "undefined"
        assert(placeholder as References<5>).typed as "5"
        assert(placeholder as References<7n>).typed as "7n"
        assert(placeholder as References<true>).typed as "true"
        assert(placeholder as References<false>).typed as "false"
    })
    test("string", () => {
        const references =
            {} as References<"(user[],group[])=>boolean|number|null">
        assert(references).typed as
            | "number"
            | "boolean"
            | "null"
            | "user"
            | "group"

        const listedFilteredReferences = {} as References<
            "(user[],group[])=>boolean|number|null",
            { asList: true; filter: `${string}${"o"}${string}` }
        >
        assert(listedFilteredReferences).typed as ["boolean", "group"]
    })
    test("object", () => {
        const refs = {} as References<{
            listed: ["group|null", "user|null", "(string, number)=>function"]
            a: { b: { c: "user[]?" } }
        }>
        assert(refs).typed as {
            listed: [
                "group" | "null",
                "user" | "null",
                "string" | "number" | "function"
            ]
            a: {
                b: {
                    c: "user"
                }
            }
        }
    })
})

describe("references from value", () => {
    test("shallow", () => {
        assert(parse(5).references()).equals(["5"]).typed as ["5"]
        assert(parse(null).references()).equals(["null"]).typed as ["null"]
        assert(parse(0n).references()).equals(["0n"]).typed as ["0n"]
        assert(parse("string").references()).equals(["string"]).typed as [
            "string"
        ]
        const expressionReferences = parse(
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
        const aliasReferences = parse("user|string", {
            typespace: { user: "any" }
        }).references()
        assert(diffSets(["string", "user"], aliasReferences) as any).is(
            undefined
        )
        assert(aliasReferences).typed as ("string" | "user")[]
    })
    test("object", () => {
        const objectReferences = parse(
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
            { typespace: { custom: "any" } }
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

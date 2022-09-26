import { assert } from "@re-/assert"
import type { ElementOf } from "@re-/tools"
import { isNumeric, narrow } from "@re-/tools"
import { describe, test } from "mocha"
import { space, type } from "../../api.js"

describe("references", () => {
    const objectDef = narrow({
        strings: {
            keyword: "boolean",
            expression: "string[]|integer?"
        },
        listed: ["-1n", "null", "string|boolean"],
        regex: `/.*/`
    })

    const expectedObjectDefReferences = narrow([
        "/.*/",
        "-1n",
        "null",
        "string",
        "boolean",
        "integer"
    ])

    type ExpectedObjectDefReferenceTuple = typeof expectedObjectDefReferences

    type ExpectedObjectDefReferenceUnion =
        ElementOf<ExpectedObjectDefReferenceTuple>

    type ExpectedObjectDefReferenceList = ExpectedObjectDefReferenceUnion[]

    describe("model", () => {
        test("from string", () => {
            const references = space({ user: "unknown", group: "unknown" })
                .$root.type("0<(user[]|group[]|boolean&true|integer|null)[]<2")
                .references()
            const expectedReferenceSet = narrow([
                "user",
                "group",
                "boolean",
                "true",
                "integer",
                "null"
            ])
            type ExpectedReferences = ElementOf<typeof expectedReferenceSet>[]
            assert(references).equals(expectedReferenceSet, {
                listComparison: "permutable"
            }).typed as ExpectedReferences
        })
        test("from string with duplicates", () => {
            const zeroAndOne = type("0|1|0[]|1[]|0[][]|1[][]?").references()
            assert(zeroAndOne).equals(["0", "1"]).typed as ("0" | "1")[]
        })
        test("from object", () => {
            const references = type(objectDef).references()
            assert(references).equals(expectedObjectDefReferences, {
                listComparison: "permutable"
            }).typed as ExpectedObjectDefReferenceList
        })
        test("filter", () => {
            const referencesIncludingE = type(objectDef).references({
                filter: (reference) => reference.includes("e")
            })
            assert(referencesIncludingE).equals(["integer", "boolean"], {
                listComparison: "permutable"
            }).typed as ExpectedObjectDefReferenceList
        })
        test("typed filter", () => {
            const bigintLiteralReferences = type(objectDef).references({
                filter: (reference): reference is `${number}n` =>
                    isNumeric(reference.slice(0, -1)) &&
                    reference.slice(-1) === "n"
            })
            assert(bigintLiteralReferences).equals(["-1n"], {
                listComparison: "permutable"
            }).typed as "-1n"[]
        })
    })
})

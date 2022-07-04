import { assert } from "@re-/assert"
import { ElementOf, Evaluate, narrow } from "@re-/tools"
import { model, References, space } from "../src/index.js"

describe("references", () => {
    const objectDef = {
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
        listed: [-1n, "null", "string|boolean"],
        regex: /.*/
    } as const

    type ObjectDef = typeof objectDef

    const expectedObjectDefReferences = narrow([
        "/.*/" as `/${string}/`,
        "-1n",
        "null",
        "string",
        "boolean",
        "undefined",
        "null",
        "false",
        "true",
        "5",
        "7n",
        "boolean",
        "string",
        "integer",
        "positive",
        "null"
    ])

    type ExpectedObjectDefReferences = typeof expectedObjectDefReferences

    describe("model", () => {
        it("from literal", () => {
            assert(model(undefined).references()).equals(["undefined"])
                .typed as "undefined"[]
            assert(model(null).references()).equals(["null"]).typed as "null"[]
            assert(model(true).references()).equals(["true"]).typed as "true"[]
            assert(model(5).references()).equals(["5"]).typed as "5"[]
            assert(model(0n).references()).equals(["0n"]).typed as "0n"[]
        })
        it("from string", () => {
            const references = space({ user: "unknown", group: "unknown" })
                .create(
                    "user[]|group[]|boolean&true|integer&positive|null|1<number<2"
                )
                .references()
            const expectedReferenceSet = narrow([
                "user",
                "group",
                "boolean",
                "true",
                "number",
                "integer",
                "positive",
                "null"
            ])
            type ExpectedReferences = ElementOf<typeof expectedReferenceSet>[]
            assert(references).equals(expectedReferenceSet, {
                listComparison: "unordered"
            }).typed as ExpectedReferences
        })
        it("from object", () => {
            const references = model(objectDef).references()
            type ExpectedReferences = ElementOf<ExpectedObjectDefReferences>[]
            assert(references).equals(expectedObjectDefReferences, {
                listComparison: "unordered"
            }).typed as ExpectedReferences
        })
        it("from object with preserveStructure", () => {
            const references = model(objectDef).references({
                preserveStructure: true
            })
            const expectedReferenceSets = narrow({
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
                listed: [["-1n"], ["null"], ["string", "boolean"]],
                regex: ["/.*/" as `/${string}/`]
            })
            type ExtractExpectedReferences<T> = Evaluate<{
                [K in keyof T]: T[K] extends string[]
                    ? ElementOf<T[K]>[]
                    : ExtractExpectedReferences<T[K]>
            }>
            type ExpectedReferences = ExtractExpectedReferences<
                typeof expectedReferenceSets
            >
            assert(references).equals(expectedReferenceSets, {
                listComparison: "deepUnordered"
            }).typed as ExpectedReferences
        })
    })
    describe("type", () => {
        describe("format", () => {
            it("default (list)", () => {
                const actual = {} as References<ObjectDef>
                type ExpectedReferences =
                    ElementOf<ExpectedObjectDefReferences>[]
                assert(actual).typed as ExpectedReferences
            })
            it("tuple", () => {
                const actual = {} as References<
                    "string|number[]|boolean&true?",
                    { format: "tuple" }
                >
                assert(actual).typed as ["string", "number", "boolean", "true"]
            })
            it("union", () => {
                const actual = {} as References<ObjectDef, { format: "union" }>
                type ExpectedReferences = ElementOf<ExpectedObjectDefReferences>
                assert(actual).typed as ExpectedReferences
            })
        })
    })
})

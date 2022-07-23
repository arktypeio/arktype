export {}
import { assert } from "@re-/assert"
import { ElementOf, Evaluate, isNumeric, narrow } from "@re-/tools"
import { References, space, type } from "../src/index.js"

describe("references", () => {
    const objectDef = {
        strings: {
            keyword: "boolean",
            expression: "string[]|(integer>0)|null"
        },
        listed: ["-1n", "null", "string|boolean"],
        regex: /.*/
    } as const

    type ObjectDef = typeof objectDef

    const expectedObjectDefReferences = narrow([
        "/.*/" as `/${string}/`,
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
        it("from string", () => {
            const references = space({ user: "unknown", group: "unknown" })
                .$root.type(
                    "user[]|group[]|boolean&true|(integer>0)|null|1<number<2"
                )
                .references()
            const expectedReferenceSet = narrow([
                "user",
                "group",
                "boolean",
                "true",
                "number",
                "integer",
                "null"
            ])
            type ExpectedReferences = ElementOf<typeof expectedReferenceSet>[]
            assert(references).equals(expectedReferenceSet, {
                listComparison: "permutable"
            }).typed as ExpectedReferences
        })
        it("from string with duplicates", () => {
            const zeroAndOne = type("0|1|0[]|1[]|0[][]|1[][]?").references()
            assert(zeroAndOne).equals(["0", "1"]).typed as ("0" | "1")[]
        })
        it("from object", () => {
            const references = type(objectDef).references()
            assert(references).equals(expectedObjectDefReferences, {
                listComparison: "permutable"
            }).typed as ExpectedObjectDefReferenceList
        })
        it("from object with preserveStructure", () => {
            const references = type(objectDef).references({
                preserveStructure: true
            })
            const expectedReferenceSets = narrow({
                strings: {
                    keyword: ["boolean"],
                    expression: ["string", "integer", "null"]
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
                listComparison: "permutable"
            }).typed as ExpectedReferences
        })
        it("filter", () => {
            const referencesIncludingE = type(objectDef).references({
                filter: (reference) => reference.includes("e")
            })
            assert(referencesIncludingE).equals(["integer", "boolean"], {
                listComparison: "permutable"
            }).typed as ExpectedObjectDefReferenceList
        })
        it("typed filter", () => {
            const bigintLiteralReferences = type(objectDef).references({
                filter: (reference): reference is `${number}n` =>
                    isNumeric(reference.slice(0, -1)) &&
                    reference.at(-1) === "n"
            })
            assert(bigintLiteralReferences).equals(["-1n"], {
                listComparison: "permutable"
            }).typed as "-1n"[]
        })
        it("filtered structured", () => {
            const mySpace = space({
                a: "any",
                b: "boolean",
                c: {
                    its: "'as'",
                    easyAs: ["a|string", "a|b|boolean", "a|b|c|never"]
                }
            })
            type Dictionary = typeof mySpace.$root.dictionary
            const references = mySpace.c.references({
                preserveStructure: true,
                filter: (reference): reference is keyof Dictionary =>
                    reference in mySpace.$root.dictionary
            })
            assert(references).equals(
                {
                    its: [],
                    easyAs: [["a"], ["a", "b"], ["a", "b", "c"]]
                },
                { listComparison: "permutable" }
            ).typed as {
                its: never[]
                easyAs: ["a"[], ("a" | "b")[], ("a" | "b" | "c")[]]
            }
        })
    })
    describe("type", () => {
        describe("format", () => {
            it("default (list)", () => {
                const actual = {} as References<ObjectDef, {}>
                assert(actual).typed as ExpectedObjectDefReferenceList
            })
            it("tuple", () => {
                const actual = {} as References<
                    "string|number[]|boolean&true?",
                    {},
                    { format: "tuple" }
                >
                assert(actual).typed as ["string", "number", "boolean", "true"]
            })
            it("union", () => {
                const actual = {} as References<
                    ObjectDef,
                    {},
                    { format: "union" }
                >
                assert(actual).typed as ExpectedObjectDefReferenceUnion
            })
        })
        it("filters", () => {
            const referencesContainingI = {} as References<
                ObjectDef,
                {},
                { filter: `${string}i${string}`; format: "union" }
            >
            assert(referencesContainingI).typed as "string" | "integer"
        })
    })
})

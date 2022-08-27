import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../index.js"

describe("tuple", () => {
    describe("empty", () => {
        const empty = () => type([])
        test("type", () => {
            assert(empty().infer).typed as []
        })
        test("validation", () => {
            assert(empty().check([]).error).is(undefined)
            assert(empty().check({}).error?.message).snap(
                `{} is not assignable to [].`
            )
        })
        test("generation", () => {
            assert(empty().create()).equals([])
        })
    })
    describe("shallow", () => {
        const shallow = () => type(["string", "number", "6"])
        describe("type", () => {
            test("standard", () => {
                assert(shallow().infer).typed as [string, number, 6]
            })
            describe("errors", () => {
                test("invalid item definition", () => {
                    assert(() =>
                        // @ts-expect-error
                        type(["string", ["number", "boolean", "whoops"]])
                    )
                        .throws(
                            "Unable to determine the type of 'whoops' at path 1/2."
                        )
                        .type.errors("Unable to determine the type of 'whoops'")
                })
            })
        })
        describe("validation", () => {
            test("standard", () => {
                assert(shallow().check(["violin", 42, 6]).error).is(undefined)
            })
            describe("errors", () => {
                test("bad item value", () => {
                    assert(
                        shallow().check(["violin", 42n, 6]).error?.message
                    ).snap(`At index 1, 42n is not assignable to number.`)
                })
                test("too short", () => {
                    assert(shallow().check(["violin", 42]).error?.message).snap(
                        `Tuple of length 2 is not assignable to tuple of length 3.`
                    )
                })
                test("too long", () => {
                    assert(
                        shallow().check(["violin", 42, 6, null]).error?.message
                    ).snap(
                        `Tuple of length 4 is not assignable to tuple of length 3.`
                    )
                })
            })
        })
        test("generation", () => {
            assert(shallow().create()).equals(["", 0, 6])
        })
    })
    describe("nested", () => {
        const nested = () =>
            type(["'Cuckoo'", ["'Swallow'", "'Oriole'", "'Condor'"], []])
        describe("type", () => {
            test("handles nested tuples", () => {
                assert(nested().infer).typed as [
                    "Cuckoo",
                    ["Swallow", "Oriole", "Condor"],
                    []
                ]
            })
            test("removes readonly modifier", () => {
                const readonlyDef = ["true", "false", ["boolean"]] as const
                assert(type(readonlyDef).infer).typed as [
                    true,
                    false,
                    [boolean]
                ]
            })
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    nested().check([
                        "Cuckoo",
                        ["Swallow", "Oriole", "Condor"],
                        []
                    ]).error?.message
                ).is(undefined)
            })
            describe("errors", () => {
                test("single", () => {
                    assert(
                        nested().check([
                            "Cuckoo",
                            ["Swallow", "Oriole", "Gondor"]
                        ]).error?.message
                    ).snap(
                        `Tuple of length 2 is not assignable to tuple of length 3.`
                    )
                })
                test("multiple", () => {
                    assert(
                        nested().check([
                            "Clock",
                            ["Swallow", "Oriole", "Gondor"],
                            ["Too long"]
                        ]).error?.message
                    ).snap(`Encountered errors at the following paths:
  0: "Clock" is not assignable to 'Cuckoo'.
  2: Tuple of length 1 is not assignable to tuple of length 0.
  1/2: "Gondor" is not assignable to 'Condor'.
`)
                })
            })
        })
        test("generation", () => {
            assert(nested().create()).equals([
                "Cuckoo",
                ["Swallow", "Oriole", "Condor"],
                []
            ])
        })
    })
})

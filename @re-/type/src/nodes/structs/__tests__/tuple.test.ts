import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"
import { unresolvableMessage } from "../../../parser/str/operand/unenclosed.js"
import type { Allows } from "../../allows.js"

describe("tuple", () => {
    describe("empty", () => {
        const empty = () => type([])
        test("type", () => {
            assert(empty().infer).typed as []
        })
        test("validation", () => {
            assert(empty().check([]).errors).is(undefined)
            assert(empty().check({}).errors?.summary).snap(`Must be an array`)
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
                    ).throwsAndHasTypeError(unresolvableMessage("whoops"))
                })
            })
        })
        describe("validation", () => {
            test("standard", () => {
                assert(shallow().check(["violin", 42, 6]).errors).is(undefined)
            })
            describe("errors", () => {
                test("bad item value", () => {
                    assert(
                        shallow().check(["violin", 42n, 6]).errors?.summary
                    ).snap(`1 must be a number (was bigint)`)
                })
                test("too short", () => {
                    assert(
                        shallow().check(["violin", 42]).errors as any as [
                            Allows.Diagnostic<"tupleLength">
                        ]
                    ).snap([
                        {
                            code: `tupleLength`,
                            path: [],
                            context: {
                                definition: ["string", "number", "6"],
                                data: [`violin`, 42],
                                expected: 3,
                                actual: 2
                            },
                            options: {},
                            message: `Must have length 3 (was 2)`
                        }
                    ])
                })
                test("too long", () => {
                    assert(
                        shallow().check(["violin", 42, 6, null]).errors?.summary
                    ).snap(`Must have length 3 (was 4)`)
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
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    nested().check([
                        "Cuckoo",
                        ["Swallow", "Oriole", "Condor"],
                        []
                    ]).errors
                ).is(undefined)
            })
            describe("errors", () => {
                test("single", () => {
                    assert(
                        nested().check([
                            "Cuckoo",
                            ["Swallow", "Oriole", "Gondor"]
                        ]).errors?.summary
                    ).snap(`Must have length 3 (was 2)`)
                })
                test("multiple", () => {
                    assert(
                        nested().check([
                            "Clock",
                            ["Swallow", "Oriole", "Gondor"],
                            ["Too long"]
                        ]).errors?.summary
                    ).snap(`Encountered errors at the following paths:
  0: Must be "Cuckoo" (was "Clock").
  1/2: Must be "Condor" (was "Gondor").
  2: Must have length 0 (was 1).
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

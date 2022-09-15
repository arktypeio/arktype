import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../index.js"
import { unresolvableMessage } from "../../../../../parser/operand/unenclosed.js"
import { TupleLengthDiagnostic } from "../tuple.js"

describe("tuple", () => {
    describe("empty", () => {
        const empty = () => type([])
        test("type", () => {
            assert(empty().infer).typed as []
        })
        test("validation", () => {
            assert(empty().check([]).errors).is(undefined)
            assert(empty().check({}).errors?.summary).snap(
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
                    ).snap(`At path 1, 42n is not assignable to number.`)
                })
                test("too short", () => {
                    assert(
                        shallow().check(["violin", 42]).errors as any as [
                            TupleLengthDiagnostic
                        ]
                    ).snap([
                        {
                            code: `TupleLength`,
                            path: [],
                            data: [`violin`, 42],
                            options: undefined,
                            expectedLength: 3,
                            actualLength: 2,
                            message: `Tuple must have length 3 (got 2).`
                        }
                    ])
                })
                test("too long", () => {
                    assert(
                        shallow().check(["violin", 42, 6, null]).errors?.summary
                    ).snap(`Tuple must have length 3 (got 4).`)
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
                    ).snap(`Tuple must have length 3 (got 2).`)
                })
                test("multiple", () => {
                    assert(
                        nested().check([
                            "Clock",
                            ["Swallow", "Oriole", "Gondor"],
                            ["Too long"]
                        ]).errors?.summary
                    ).snap(`Encountered errors at the following paths:
  0: "Clock" is not assignable to "Cuckoo".
  1/2: "Gondor" is not assignable to "Condor".
  2: Tuple must have length 0 (got 1).
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

import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { lazily } from "@re-/tools"

export const testTuple = () => {
    describe("empty", () => {
        const empty = lazily(() => model([]))
        test("type", () => {
            assert(empty.type).typed as []
        })
        test("validation", () => {
            assert(empty.validate([]).error).is(undefined)
            assert(empty.validate({}).error).snap(
                `"{} is not assignable to []."`
            )
        })
        test("generation", () => {
            assert(empty.generate()).equals([])
        })
    })
    describe("shallow", () => {
        const shallow = lazily(() => model(["string", "number", 6]))
        describe("type", () => {
            test("standard", () => {
                assert(shallow.type).typed as [string, number, 6]
            })
            describe("errors", () => {
                test("invalid item definition", () => {
                    assert(() =>
                        // @ts-expect-error
                        model(["string", ["number", "boolean", "whoops"]])
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
                assert(shallow.validate(["violin", 42, 6]).error).is(undefined)
            })
            describe("errors", () => {
                test("bad item value", () => {
                    assert(shallow.validate(["violin", 42n, 6]).error).snap(
                        `"At index 1, 42n is not assignable to number."`
                    )
                })
                test("too short", () => {
                    assert(shallow.validate(["violin", 42]).error).snap(
                        `"Tuple of length 2 is not assignable to tuple of length 3."`
                    )
                })
                test("too long", () => {
                    assert(
                        shallow.validate(["violin", 42, 6, null]).error
                    ).snap(
                        `"Tuple of length 4 is not assignable to tuple of length 3."`
                    )
                })
            })
        })
        test("generation", () => {
            assert(shallow.generate()).equals(["", 0, 6])
        })
    })
    describe("nested", () => {
        const nested = lazily(() =>
            model(["'Cuckoo'", ["'Swallow'", "'Oriole'", "'Condor'"], []])
        )
        test("type", () => {
            assert(nested.type).typed as [
                "Cuckoo",
                ["Swallow", "Oriole", "Condor"],
                []
            ]
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    nested.validate([
                        "Cuckoo",
                        ["Swallow", "Oriole", "Condor"],
                        []
                    ]).error
                ).is(undefined)
            })
            describe("errors", () => {
                test("single", () => {
                    assert(
                        nested.validate([
                            "Cuckoo",
                            ["Swallow", "Oriole", "Gondor"]
                        ]).error
                    ).snap(
                        `"Tuple of length 2 is not assignable to tuple of length 3."`
                    )
                })
                test("multiple", () => {
                    assert(
                        nested.validate([
                            "Clock",
                            ["Swallow", "Oriole", "Gondor"],
                            ["Too long"]
                        ]).error
                    ).snap(`
"Encountered errors at the following paths:
{
  0: ''Clock' is not assignable to 'Cuckoo'.',
  2: 'Tuple of length 1 is not assignable to tuple of length 0.',
  1/2: ''Gondor' is not assignable to 'Condor'.'
}"
`)
                })
            })
        })
        test("generation", () => {
            assert(nested.generate()).equals([
                "Cuckoo",
                ["Swallow", "Oriole", "Condor"],
                []
            ])
        })
    })
}

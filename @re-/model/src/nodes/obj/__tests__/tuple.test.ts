import { assert } from "@re-/assert"
import { model } from "#api"

describe("tuple", () => {
    describe("empty", () => {
        const empty = model([])
        it("type", () => {
            assert(empty.type).typed as []
        })
        it("validation", () => {
            assert(empty.validate([]).error).is(undefined)
            assert(empty.validate({}).error).snap(`{} is not assignable to [].`)
        })
        it("generation", () => {
            assert(empty.generate()).equals([])
        })
    })
    describe("shallow", () => {
        const shallow = model(["string", "number", 6])
        describe("type", () => {
            it("standard", () => {
                assert(shallow.type).typed as [string, number, 6]
            })
            describe("errors", () => {
                it("invalid item definition", () => {
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
            it("standard", () => {
                assert(shallow.validate(["violin", 42, 6]).error).is(undefined)
            })
            describe("errors", () => {
                it("bad item value", () => {
                    assert(shallow.validate(["violin", 42n, 6]).error).snap(
                        `At index 1, 42n is not assignable to number.`
                    )
                })
                it("too short", () => {
                    assert(shallow.validate(["violin", 42]).error).snap(
                        `Tuple of length 2 is not assignable to tuple of length 3.`
                    )
                })
                it("too long", () => {
                    assert(
                        shallow.validate(["violin", 42, 6, null]).error
                    ).snap(
                        `Tuple of length 4 is not assignable to tuple of length 3.`
                    )
                })
            })
        })
        it("generation", () => {
            assert(shallow.generate()).equals(["", 0, 6])
        })
    })
    describe("nested", () => {
        const nested = model([
            "'Cuckoo'",
            ["'Swallow'", "'Oriole'", "'Condor'"],
            []
        ])
        describe("type", () => {
            it("handles nested tuples", () => {
                assert(nested.type).typed as [
                    "Cuckoo",
                    ["Swallow", "Oriole", "Condor"],
                    []
                ]
            })
            it("removes readonly modifier", () => {
                const readonlyDef = ["true", "false", ["boolean"]] as const
                assert(model(readonlyDef).type).typed as [
                    true,
                    false,
                    [boolean]
                ]
            })
        })
        describe("validation", () => {
            it("standard", () => {
                assert(
                    nested.validate([
                        "Cuckoo",
                        ["Swallow", "Oriole", "Condor"],
                        []
                    ]).error
                ).is(undefined)
            })
            describe("errors", () => {
                it("single", () => {
                    assert(
                        nested.validate([
                            "Cuckoo",
                            ["Swallow", "Oriole", "Gondor"]
                        ]).error
                    ).snap(
                        `Tuple of length 2 is not assignable to tuple of length 3.`
                    )
                })
                it("multiple", () => {
                    assert(
                        nested.validate([
                            "Clock",
                            ["Swallow", "Oriole", "Gondor"],
                            ["Too long"]
                        ]).error
                    ).snap(`Encountered errors at the following paths:
{
  0: ''Clock' is not assignable to 'Cuckoo'.',
  2: 'Tuple of length 1 is not assignable to tuple of length 0.',
  1/2: ''Gondor' is not assignable to 'Condor'.'
}`)
                })
            })
        })
        it("generation", () => {
            assert(nested.generate()).equals([
                "Cuckoo",
                ["Swallow", "Oriole", "Condor"],
                []
            ])
        })
    })
})

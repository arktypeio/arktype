import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { lazily } from "@re-/tools"

export const testLiteral = () => {
    describe("number", () => {
        describe("type", () => {
            test("whole", () => {
                assert(model(4).type).typed as 4
            })
            test("decimal", () => {
                assert(model(1.234).type).typed as 1.234
            })
            test("negative", () => {
                assert(model(-5.7).type).typed as -5.7
            })
        })
        describe("validation", () => {
            test("whole", () => {
                const { validate } = model(8)
                assert(validate(8).error).is(undefined)
                assert(validate(8).error).is(undefined)
                assert(validate(8.000_001).error).is(
                    "8.000001 is not assignable to 8."
                )
                assert(validate("8").error).is("'8' is not assignable to 8.")
            })
            test("decimal", () => {
                const { validate } = model(1.618)
                assert(validate(1.618).error).is(undefined)
                assert(validate(2).error).is("2 is not assignable to 1.618.")
                assert(validate("1.618").error).is(
                    "'1.618' is not assignable to 1.618."
                )
            })
            test("negative", () => {
                const { validate } = model(-13.37)
                assert(validate(-13.37).error).is(undefined)
                assert(validate(-14).error).is(
                    "-14 is not assignable to -13.37."
                )
                assert(validate("-13.37").error).is(
                    "'-13.37' is not assignable to -13.37."
                )
            })
        })
        describe("generation", () => {
            test("whole", () => {
                assert(model(31).generate()).is(31)
            })
            test("decimal", () => {
                assert(model(31.31).generate()).is(31.31)
            })
            test("negative", () => {
                assert(model(-31.31).generate()).is(-31.31)
            })
        })
    })
    describe("bigint", () => {
        describe("type", () => {
            test("positive", () => {
                assert(model(999_999_999_999_999n).type)
                    .typed as 999_999_999_999_999n
            })
            test("negative", () => {
                assert(model(-1n).type).typed as -1n
            })
        })
        describe("validation", () => {
            test("positive", () => {
                assert(
                    // Is prime :D
                    model(12_345_678_910_987_654_321n).validate(
                        12_345_678_910_987_654_321n
                    ).error
                ).is(undefined)
            })
            test("negative", () => {
                assert(
                    model(-18_446_744_073_709_551_616n).validate(
                        -BigInt(2 ** 64)
                    ).error
                ).is(undefined)
            })
            describe("errors", () => {
                test("wrong value", () => {
                    assert(model(999n).validate(1000n).error).snap(
                        `"1000n is not assignable to 999n."`
                    )
                })
                test("non-bigint", () => {
                    assert(model(0n).validate(0).error).snap(
                        `"0 is not assignable to 0n."`
                    )
                })
            })
        })
        describe("generation", () => {
            test("positive", () => {
                assert(model(1n).generate()).is(1n)
            })
            test("negative", () => {
                assert(model(-1n).generate()).is(-1n)
            })
        })
    })
    describe("boolean", () => {
        describe("true", () => {
            const t = lazily(() => model(true))
            test("type", () => {
                assert(t.type).typed as true
            })
            test("generation", () => {
                assert(t.generate()).is(true)
            })
            test("validation", () => {
                assert(t.validate(true).error).is(undefined)
                assert(t.validate(false).error).snap(
                    `"false is not assignable to true."`
                )
            })
        })
        describe("false", () => {
            const f = lazily(() => model(false))
            test("type", () => {
                assert(f.type).typed as false
            })
            test("generation", () => {
                assert(f.generate()).is(false)
            })
            test("validation", () => {
                assert(f.validate(false).error).is(undefined)
                assert(f.validate(true).error).snap(
                    `"true is not assignable to false."`
                )
            })
        })
    })
    describe("undefined", () => {
        const u = lazily(() => model(undefined))
        test("type", () => {
            assert(u.type).typed as undefined
        })
        test("generation", () => {
            assert(u.generate()).is(undefined)
        })
        test("validation", () => {
            assert(u.validate(undefined).error).is(undefined)
            assert(u.validate(null).error).snap(
                `"null is not assignable to undefined."`
            )
        })
    })
    describe("null", () => {
        const n = lazily(() => model(null))
        test("type", () => {
            assert(n.type).typed as null
        })
        test("generation", () => {
            assert(n.generate()).is(null)
        })
        test("validation", () => {
            assert(n.validate(null).error).is(undefined)
            assert(n.validate(undefined).error).snap(
                `"undefined is not assignable to null."`
            )
        })
    })
    describe("regex", () => {
        const regex = lazily(() => model(/.*@redo\.dev/))
        test("type", () => {
            assert(regex.type).typed as string
        })
        test("generation", () => {
            assert(() => regex.generate()).throws.snap(
                `"Generation of regular expressions is not supported."`
            )
        })
        test("validation", () => {
            assert(regex.validate("david@redo.dev").error).is(undefined)
            assert(regex.validate("david@redo.qa").error).snap(
                `"'david@redo.qa' is not assignable to /.*@redo\\\\.dev/."`
            )
            assert(regex.validate({ inObject: "david@redo.dev" }).error).snap(
                `"{inObject: 'david@redo.dev'} is not assignable to /.*@redo\\\\.dev/."`
            )
        })
    })
}

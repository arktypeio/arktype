import { assert } from "@re-/assert"
import { lazily } from "@re-/tools"
import { create } from "@re-/model"

export const testPrimitive = () => {
    describe("number", () => {
        describe("type", () => {
            test("whole", () => {
                assert(create(4).type).typed as 4
            })
            test("decimal", () => {
                assert(create(1.234).type).typed as 1.234
            })
            test("negative", () => {
                assert(create(-5.7).type).typed as -5.7
            })
        })
        describe("validation", () => {
            test("whole", () => {
                const { validate } = create(8)
                assert(validate(8).error).is(undefined)
                assert(validate(8.0).error).is(undefined)
                assert(validate(8.000001).error).is(
                    "8.000001 is not assignable to 8."
                )
                assert(validate("8").error).is("'8' is not assignable to 8.")
            })
            test("decimal", () => {
                const { validate } = create(1.618)
                assert(validate(1.618).error).is(undefined)
                assert(validate(2).error).is("2 is not assignable to 1.618.")
                assert(validate("1.618").error).is(
                    "'1.618' is not assignable to 1.618."
                )
            })
            test("negative", () => {
                const { validate } = create(-13.37)
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
                assert(create(31).generate()).is(31)
            })
            test("decimal", () => {
                assert(create(31.31).generate()).is(31.31)
            })
            test("negative", () => {
                assert(create(-31.31).generate()).is(-31.31)
            })
        })
    })
    describe("bigint", () => {
        describe("type", () => {
            test("positive", () => {
                assert(create(999999999999999n).type).typed as 999999999999999n
            })
            test("negative", () => {
                assert(create(-1n).type).typed as -1n
            })
        })
        describe("validation", () => {
            test("positive", () => {
                assert(
                    // Is prime :D
                    create(12345678910987654321n).validate(
                        12345678910987654321n
                    ).error
                ).is(undefined)
            })
            test("negative", () => {
                assert(
                    create(-18446744073709551616n).validate(-BigInt(2 ** 64))
                        .error
                ).is(undefined)
            })
            describe("errors", () => {
                test("wrong value", () => {
                    assert(create(999n).validate(1000n).error).snap(
                        `"1000n is not assignable to 999n."`
                    )
                })
                test("non-bigint", () => {
                    assert(create(0n).validate(0).error).snap(
                        `"0 is not assignable to 0n."`
                    )
                })
            })
        })
        describe("generation", () => {
            test("positive", () => {
                assert(create(1n).generate()).is(1n)
            })
            test("negative", () => {
                assert(create(-1n).generate()).is(-1n)
            })
        })
    })
    describe("boolean", () => {
        describe("true", () => {
            const t = lazily(() => create(true))
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
            const f = lazily(() => create(false))
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
        const u = lazily(() => create(undefined))
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
        const n = lazily(() => create(null))
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
}

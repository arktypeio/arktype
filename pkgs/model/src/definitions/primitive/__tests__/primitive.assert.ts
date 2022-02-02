import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testPrimitive = () => {
    describe("number", () => {
        describe("type", () => {
            test("whole", () => {
                assert(define(4).type).typed as 4
            })
            test("decimal", () => {
                assert(define(1.234).type).typed as 1.234
            })
            test("negative", () => {
                assert(define(-5.7).type).typed as -5.7
            })
        })
        describe("validation", () => {
            test("whole", () => {
                const { validate } = define(8)
                assert(validate(8).errors).is(undefined)
                assert(validate(8.0).errors).is(undefined)
                assert(validate(8.000001).errors).is(
                    "8.000001 is not assignable to 8."
                )
                assert(validate("8").errors).is("'8' is not assignable to 8.")
            })
            test("decimal", () => {
                const { validate } = define(1.618)
                assert(validate(1.618).errors).is(undefined)
                assert(validate(2).errors).is("2 is not assignable to 1.618.")
                assert(validate("1.618").errors).is(
                    "'1.618' is not assignable to 1.618."
                )
            })
            test("negative", () => {
                const { validate } = define(-13.37)
                assert(validate(-13.37).errors).is(undefined)
                assert(validate(-14).errors).is(
                    "-14 is not assignable to -13.37."
                )
                assert(validate("-13.37").errors).is(
                    "'-13.37' is not assignable to -13.37."
                )
            })
        })
        describe("generation", () => {
            test("whole", () => {
                assert(define(31).generate()).is(31)
            })
            test("decimal", () => {
                assert(define(31.31).generate()).is(31.31)
            })
            test("negative", () => {
                assert(define(-31.31).generate()).is(-31.31)
            })
        })
    })
    describe("bigint", () => {
        describe("type", () => {
            test("positive", () => {
                assert(define(999999999999999n).type).typed as 999999999999999n
            })
            test("negative", () => {
                assert(define(-1n).type).typed as -1n
            })
        })
        describe("validation", () => {
            test("positive", () => {
                assert(
                    // Is prime :D
                    define(12345678910987654321n).validate(
                        12345678910987654321n
                    ).errors
                ).is(undefined)
            })
            test("negative", () => {
                assert(
                    define(-18446744073709551616n).validate(-BigInt(2 ** 64))
                        .errors
                ).is(undefined)
            })
            describe("errors", () => {
                test("wrong value", () => {
                    assert(define(999n).validate(1000n).errors).snap(
                        `"1000n is not assignable to 999n."`
                    )
                })
                test("non-bigint", () => {
                    assert(define(0n).validate(0).errors).snap(
                        `"0 is not assignable to 0n."`
                    )
                })
            })
        })
        describe("generation", () => {
            test("positive", () => {
                assert(define(1n).generate()).is(1n)
            })
            test("negative", () => {
                assert(define(-1n).generate()).is(-1n)
            })
        })
    })
    describe("boolean", () => {
        describe("true", () => {
            test("type", () => {
                assert(define(true).type).typed as true
            })
            test("generation", () => {
                assert(define(true).generate()).is(true)
            })
            test("validation", () => {
                const { validate } = define(true)
                assert(validate(true).errors).is(undefined)
                assert(validate(false).errors).snap(
                    `"false is not assignable to true."`
                )
            })
        })
        describe("false", () => {
            test("type", () => {
                assert(define(false).type).typed as false
            })
            test("generation", () => {
                assert(define(false).generate()).is(false)
            })
            test("validation", () => {
                const { validate } = define(false)
                assert(validate(false).errors).is(undefined)
                assert(validate(true).errors).snap(
                    `"true is not assignable to false."`
                )
            })
        })
    })
    describe("undefined", () => {
        test("type", () => {
            assert(define(undefined).type).typed as undefined
        })
        test("generation", () => {
            assert(define(undefined).generate()).is(undefined)
        })
        test("validation", () => {
            const { validate } = define(undefined)
            assert(validate(undefined).errors).is(undefined)
            assert(validate(null).errors).snap(
                `"null is not assignable to undefined."`
            )
        })
    })
    describe("null", () => {
        test("type", () => {
            assert(define(null).type).typed as null
        })
        test("generation", () => {
            assert(define(null).generate()).is(null)
        })
        test("validation", () => {
            const { validate } = define(null)
            assert(validate(null).errors).is(undefined)
            assert(validate(undefined).errors).snap(
                `"undefined is not assignable to null."`
            )
        })
    })
}

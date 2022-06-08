import { assert } from "@re-/assert"
import { lazily } from "@re-/tools"
import { model } from "#api"

describe("number", () => {
    describe("type", () => {
        it("whole", () => {
            assert(model(4).type).typed as 4
        })
        it("decimal", () => {
            assert(model(1.234).type).typed as 1.234
        })
        it("negative", () => {
            assert(model(-5.7).type).typed as -5.7
        })
    })
    describe("validation", () => {
        it("whole", () => {
            const { validate } = model(8)
            assert(validate(8).error).is(undefined)
            assert(validate(8).error).is(undefined)
            assert(validate(8.000001).error).is(
                "8.000001 is not assignable to 8."
            )
            assert(validate("8").error).is("'8' is not assignable to 8.")
        })
        it("decimal", () => {
            const { validate } = model(1.618)
            assert(validate(1.618).error).is(undefined)
            assert(validate(2).error).is("2 is not assignable to 1.618.")
            assert(validate("1.618").error).is(
                "'1.618' is not assignable to 1.618."
            )
        })
        it("negative", () => {
            const { validate } = model(-13.37)
            assert(validate(-13.37).error).is(undefined)
            assert(validate(-14).error).is("-14 is not assignable to -13.37.")
            assert(validate("-13.37").error).is(
                "'-13.37' is not assignable to -13.37."
            )
        })
    })
    describe("generation", () => {
        it("whole", () => {
            assert(model(31).generate()).is(31)
        })
        it("decimal", () => {
            assert(model(31.31).generate()).is(31.31)
        })
        it("negative", () => {
            assert(model(-31.31).generate()).is(-31.31)
        })
    })
})
describe("bigint", () => {
    describe("type", () => {
        // For now, using type.toString() since SWC is confused by bigint cast like "as -1n"
        it("positive", () => {
            assert(model(999999999999999n).type).type.toString(
                "999999999999999n"
            )
        })
        it("negative", () => {
            assert(model(-1n).type).type.toString("-1n")
        })
    })
    describe("validation", () => {
        it("positive", () => {
            assert(
                // Is prime :D
                model(12345678910987654321n).validate(12345678910987654321n)
                    .error
            ).is(undefined)
        })
        it("negative", () => {
            assert(
                model(-18446744073709551616n).validate(-BigInt(2 ** 64)).error
            ).is(undefined)
        })
        describe("errors", () => {
            it("wrong value", () => {
                assert(model(999n).validate(1000n).error).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            it("non-bigint", () => {
                assert(model(0n).validate(0).error).snap(
                    `0 is not assignable to 0n.`
                )
            })
        })
    })
    describe("generation", () => {
        it("positive", () => {
            assert(model(1n).generate()).is(1n)
        })
        it("negative", () => {
            assert(model(-1n).generate()).is(-1n)
        })
    })
})
describe("boolean", () => {
    describe("true", () => {
        const t = lazily(() => model(true))
        it("type", () => {
            assert(t.type).typed as true
        })
        it("generation", () => {
            assert(t.generate()).is(true)
        })
        it("validation", () => {
            assert(t.validate(true).error).is(undefined)
            assert(t.validate(false).error).snap(
                `false is not assignable to true.`
            )
        })
    })
    describe("false", () => {
        const f = lazily(() => model(false))
        it("type", () => {
            assert(f.type).typed as false
        })
        it("generation", () => {
            assert(f.generate()).is(false)
        })
        it("validation", () => {
            assert(f.validate(false).error).is(undefined)
            assert(f.validate(true).error).snap(
                `true is not assignable to false.`
            )
        })
    })
})
describe("undefined", () => {
    const u = lazily(() => model(undefined))
    it("type", () => {
        assert(u.type).typed as undefined
    })
    it("generation", () => {
        assert(u.generate()).is(undefined)
    })
    it("validation", () => {
        assert(u.validate(undefined).error).is(undefined)
        assert(u.validate(null).error).snap(
            `null is not assignable to undefined.`
        )
    })
})
describe("null", () => {
    const n = lazily(() => model(null))
    it("type", () => {
        assert(n.type).typed as null
    })
    it("generation", () => {
        assert(n.generate()).is(null)
    })
    it("validation", () => {
        assert(n.validate(null).error).is(undefined)
        assert(n.validate(undefined).error).snap(
            `undefined is not assignable to null.`
        )
    })
})

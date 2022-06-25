import { assert } from "@re-/assert"
import { model } from "../../src/index.js"

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
            const eight = model(8)
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8.000_001).error?.message).is(
                "8.000001 is not assignable to 8."
            )
            assert(eight.validate("8").error?.message).is(
                "'8' is not assignable to 8."
            )
        })
        it("decimal", () => {
            const goldenRatio = model(1.618)
            assert(goldenRatio.validate(1.618).error?.message).is(undefined)
            assert(goldenRatio.validate(2).error?.message).is(
                "2 is not assignable to 1.618."
            )
            assert(goldenRatio.validate("1.618").error?.message).is(
                "'1.618' is not assignable to 1.618."
            )
        })
        it("negative", () => {
            const unLeet = model(-13.37)
            assert(unLeet.validate(-13.37).error).is(undefined)
            assert(unLeet.validate(-14).error?.message).is(
                "-14 is not assignable to -13.37."
            )
            assert(unLeet.validate("-13.37").error?.message).is(
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
                assert(model(999n).validate(1000n).error?.message).snap(
                    `1000n is not assignable to 999n.`
                )
            })
            it("non-bigint", () => {
                assert(model(0n).validate(0).error?.message).snap(
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
        const t = model(true)
        it("type", () => {
            assert(t.type).typed as true
        })
        it("generation", () => {
            assert(t.generate()).is(true)
        })
        it("validation", () => {
            assert(t.validate(true).error).is(undefined)
            assert(t.validate(false).error?.message).snap(
                `false is not assignable to true.`
            )
        })
    })
    describe("false", () => {
        const f = model(false)
        it("type", () => {
            assert(f.type).typed as false
        })
        it("generation", () => {
            assert(f.generate()).is(false)
        })
        it("validation", () => {
            assert(f.validate(false).error).is(undefined)
            assert(f.validate(true).error?.message).snap(
                `true is not assignable to false.`
            )
        })
    })
})
describe("undefined", () => {
    const u = model(undefined)
    it("type", () => {
        assert(u.type).typed as undefined
    })
    it("generation", () => {
        assert(u.generate()).is(undefined)
    })
    it("validation", () => {
        assert(u.validate(undefined).error).is(undefined)
        assert(u.validate(null).error?.message).snap(
            `null is not assignable to undefined.`
        )
    })
})
describe("null", () => {
    const n = model(null)
    it("type", () => {
        assert(n.type).typed as null
    })
    it("generation", () => {
        assert(n.generate()).is(null)
    })
    it("validation", () => {
        assert(n.validate(null).error).is(undefined)
        assert(n.validate(undefined).error?.message).snap(
            `undefined is not assignable to null.`
        )
    })
})

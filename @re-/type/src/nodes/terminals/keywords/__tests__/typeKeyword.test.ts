import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../scopes/type.js"

describe("type keywords", () => {
    describe("boolean", () => {
        const b = type.lazy("boolean")
        test("infer", () => {
            assert(b.infer).typed as boolean
        })
        test("generation", () => {
            assert(b.generate()).is(false)
        })
        test("check", () => {
            assert(b.check(true).errors).is(undefined)
            assert(b.check(false).errors).is(undefined)
            assert(b.check(0).errors?.summary).snap(
                `Must be boolean (was number)`
            )
        })
    })
    describe("bigint", () => {
        const b = type.lazy("bigint")
        test("infer", () => {
            assert(b.infer).typed as bigint
        })
        test("generation", () => {
            assert(b.generate()).is(0n)
        })
        test("check", () => {
            assert(b.check(999n).errors).is(undefined)
            assert(b.check(999).errors?.summary).snap(
                `Must be a bigint (was number)`
            )
        })
    })
    describe("symbol", () => {
        const s = type.lazy("symbol")
        test("infer", () => {
            assert(s.infer).typed as symbol
        })
        test("generation", () => {
            assert(typeof s.generate()).is("symbol")
        })
        test("check", () => {
            assert(s.check(Symbol("")).errors).is(undefined)
            assert(s.check("@").errors?.summary).snap(
                `Must be a symbol (was string)`
            )
        })
    })
    describe("function", () => {
        const f = type.lazy("function")
        test("infer", () => {
            assert(f.infer).typed as Function
        })
        test("generation", () => {
            assert(typeof f.generate()).equals("function")
        })
        test("check", () => {
            assert(f.check(() => ({})).errors).is(undefined)
            assert(f.check({}).errors?.summary).snap(
                `Must be a function (was object)`
            )
        })
    })
    describe("object", () => {
        const o = type.lazy("object")
        test("infer", () => {
            assert(o.infer).typed as object
        })
        test("generation", () => {
            assert(o.generate()).equals({})
        })
        test("check", () => {
            assert(o.check([]).errors).is(undefined)
            assert(o.check({}).errors).is(undefined)
            assert(o.check(null).errors?.summary).snap(
                `Must be an object (was null)`
            )
        })
    })
    describe("undefined", () => {
        const u = type.lazy("undefined")
        test("infer", () => {
            assert(u.infer).typed as undefined
        })
        test("generation", () => {
            assert(u.generate()).is(undefined)
        })
        test("check", () => {
            assert(u.check(undefined).errors).is(undefined)
            assert(u.check(null).errors?.summary).snap(
                `Must be undefined (was null)`
            )
        })
    })
    describe("null", () => {
        const n = type.lazy("null")
        test("infer", () => {
            assert(n.infer).typed as null
        })
        test("generation", () => {
            assert(n.generate()).is(null)
        })
        test("check", () => {
            assert(n.check(null).errors).is(undefined)
            assert(n.check(undefined).errors?.summary).snap(
                `Must be null (was undefined)`
            )
        })
    })
    describe("void", () => {
        const v = type.lazy("void")
        test("infer", () => {
            assert(v.infer).typed as void
        })
        test("generation", () => {
            assert(v.generate()).is(undefined)
        })
        test("check", () => {
            assert(v.check(undefined).errors).is(undefined)
            assert(v.check(null).errors?.summary).snap(
                `Must be undefined (was null)`
            )
        })
    })
    describe("any", () => {
        const a = type.lazy("any")
        test("infer", () => {
            assert(a.infer).typed as any
        })
        test("generation", () => {
            assert(a.generate()).is(undefined)
        })
        test("check", () => {
            assert(a.check(-34_324n).errors).is(undefined)
            assert(a.check({ yes: "no" }).errors).is(undefined)
            assert(a.check([0, "1", 2, "3"]).errors).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = type.lazy("unknown")
        test("infer", () => {
            assert(u.infer).typed as unknown
        })
        test("generation", () => {
            assert(u.generate()).is(undefined)
        })
        test("check", () => {
            assert(u.check(34_324n).errors).is(undefined)
            assert(u.check({ no: "yes" }).errors).is(undefined)
            assert(u.check(["0", 1, "2", 3]).errors).is(undefined)
        })
    })
    describe("never", () => {
        const n = type.lazy("never")
        test("infer", () => {
            assert(n.infer).typed as never
        })
        test("check", () => {
            assert(n.check("sometimes").errors?.summary).snap(
                `Never allowed (was string)`
            )
            assert(n.check(undefined).errors?.summary).snap(
                `Never allowed (was undefined)`
            )
        })
        test("generation", () => {
            assert(() => n.generate()).throws.snap(
                `Error: Unable to generate a value for 'never': never is ungeneratable by definition.`
            )
        })
    })
    describe("string", () => {
        const s = type.lazy("string")
        test("infer", () => {
            assert(s.infer).typed as string
        })
        test("generation", () => {
            assert(s.generate()).is("")
        })
        test("check", () => {
            assert(s.check("KEKW").errors).is(undefined)
            assert(s.check(["whoops"]).errors?.summary).snap(
                `Must be a string (was object)`
            )
        })
    })
    describe("number", () => {
        const n = type.lazy("number")
        test("infer", () => {
            assert(n.infer).typed as number
        })
        test("generation", () => {
            assert(n.generate()).is(0)
        })
        test("check", () => {
            assert(n.check(-83).errors).is(undefined)
            assert(n.check(0.999).errors).is(undefined)
            assert(n.check("42").errors?.summary).snap(
                `Must be a number (was string)`
            )
            assert(n.check(Infinity).errors).is(undefined)
            assert(n.check(NaN).errors).is(undefined)
        })
    })
})

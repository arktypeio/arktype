import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"

describe("type keywords", () => {
    describe("boolean", () => {
        const b = type("boolean")
        test("infer", () => {
            assert(b.infer).typed as boolean
        })
        test("generation", () => {
            assert(b.create()).is(false)
        })
        test("check", () => {
            assert(b.check(true).errors).is(undefined)
            assert(b.check(false).errors).is(undefined)
            assert(b.check(0).errors?.summary).snap(
                `Must be boolean (was number).`
            )
        })
    })
    describe("true", () => {
        const t = type("true")
        test("infer", () => {
            assert(t.infer).typed as true
        })
        test("generation", () => {
            assert(t.create()).is(true)
        })
        test("check", () => {
            assert(t.check(true).errors).is(undefined)
            assert(t.check(false).errors?.summary).snap(
                `Must be true (was false).`
            )
        })
    })
    describe("false", () => {
        const f = type("false")
        test("infer", () => {
            assert(f.infer).typed as false
        })
        test("generation", () => {
            assert(f.create()).is(false)
        })
        test("check", () => {
            assert(f.check(false).errors).is(undefined)
            assert(f.check(true).errors?.summary).snap(
                `Must be false (was true).`
            )
        })
    })
    describe("bigint", () => {
        const b = type("bigint")
        test("infer", () => {
            assert(b.infer).typed as bigint
        })
        test("generation", () => {
            assert(b.create()).is(0n)
        })
        test("check", () => {
            assert(b.check(999n).errors).is(undefined)
            assert(b.check(999).errors?.summary).snap(
                `Must be a bigint (was number).`
            )
        })
    })
    describe("symbol", () => {
        const s = type("symbol")
        test("infer", () => {
            assert(s.infer).typed as symbol
        })
        test("generation", () => {
            assert(typeof s.create()).is("symbol")
        })
        test("check", () => {
            assert(s.check(Symbol("")).errors).is(undefined)
            assert(s.check("@").errors?.summary).snap(
                `Must be a symbol (was string).`
            )
        })
    })
    describe("function", () => {
        const f = type("function")
        test("infer", () => {
            assert(f.infer).typed as Function
        })
        test("generation", () => {
            assert(typeof f.create()).equals("function")
        })
        test("check", () => {
            assert(f.check(() => ({})).errors).is(undefined)
            assert(f.check({}).errors?.summary).snap(
                `Must be a function (was object).`
            )
        })
    })
    describe("object", () => {
        const o = type("object")
        test("infer", () => {
            assert(o.infer).typed as object
        })
        test("generation", () => {
            assert(o.create()).equals({})
        })
        test("check", () => {
            assert(o.check([]).errors).is(undefined)
            assert(o.check({}).errors).is(undefined)
            assert(o.check(null).errors?.summary).snap(
                `Must be an object (was null).`
            )
        })
    })
    describe("undefined", () => {
        const u = type("undefined")
        test("infer", () => {
            assert(u.infer).typed as undefined
        })
        test("generation", () => {
            assert(u.create()).is(undefined)
        })
        test("check", () => {
            assert(u.check(undefined).errors).is(undefined)
            assert(u.check(null).errors?.summary).snap(
                `Must be undefined (was null).`
            )
        })
    })
    describe("null", () => {
        const n = type("null")
        test("infer", () => {
            assert(n.infer).typed as null
        })
        test("generation", () => {
            assert(n.create()).is(null)
        })
        test("check", () => {
            assert(n.check(null).errors).is(undefined)
            assert(n.check(undefined).errors?.summary).snap(
                `Must be null (was undefined).`
            )
        })
    })
    describe("void", () => {
        const v = type("void")
        test("infer", () => {
            assert(v.infer).typed as void
        })
        test("generation", () => {
            assert(v.create()).is(undefined)
        })
        test("check", () => {
            assert(v.check(undefined).errors).is(undefined)
            assert(v.check(null).errors?.summary).snap(
                `Must be undefined (was null).`
            )
        })
    })
    describe("any", () => {
        const a = type("any")
        test("infer", () => {
            assert(a.infer).typed as any
        })
        test("generation", () => {
            assert(a.create()).is(undefined)
        })
        test("check", () => {
            assert(a.check(-34_324n).errors).is(undefined)
            assert(a.check({ yes: "no" }).errors).is(undefined)
            assert(a.check([0, "1", 2, "3"]).errors).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = type("unknown")
        test("infer", () => {
            assert(u.infer).typed as unknown
        })
        test("generation", () => {
            assert(u.create()).is(undefined)
        })
        test("check", () => {
            assert(u.check(34_324n).errors).is(undefined)
            assert(u.check({ no: "yes" }).errors).is(undefined)
            assert(u.check(["0", 1, "2", 3]).errors).is(undefined)
        })
    })
    describe("never", () => {
        const n = type("never")
        test("infer", () => {
            assert(n.infer).typed as never
        })
        test("check", () => {
            assert(n.check("sometimes").errors?.summary).snap(
                `Never allowed (was string).`
            )
            assert(n.check(undefined).errors?.summary).snap(
                `Never allowed (was undefined).`
            )
        })
        test("generation", () => {
            assert(() => n.create()).throws.snap(
                `Error: Unable to generate a value for 'never': never is ungeneratable by definition.`
            )
        })
    })
    describe("string", () => {
        const s = type("string")
        test("infer", () => {
            assert(s.infer).typed as string
        })
        test("generation", () => {
            assert(s.create()).is("")
        })
        test("check", () => {
            assert(s.check("KEKW").errors).is(undefined)
            assert(s.check(["whoops"]).errors?.summary).snap(
                `Must be a string (was object).`
            )
        })
    })
    describe("number", () => {
        const n = type("number")
        test("infer", () => {
            assert(n.infer).typed as number
        })
        test("generation", () => {
            assert(n.create()).is(0)
        })
        test("check", () => {
            assert(n.check(-83).errors).is(undefined)
            assert(n.check(0.999).errors).is(undefined)
            assert(n.check("42").errors?.summary).snap(
                `Must be a number (was string).`
            )
            assert(n.check(Infinity).errors).is(undefined)
            assert(n.check(NaN).errors).is(undefined)
        })
    })
})

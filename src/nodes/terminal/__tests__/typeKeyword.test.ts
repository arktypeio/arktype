import { describe, test } from "mocha"
import { type } from "../../../type.js"
import { assert } from "#testing"

describe("type keywords", () => {
    describe("boolean", () => {
        const b = type.lazy("boolean")
        test("infer", () => {
            assert(b.infer).typed as boolean
        })
        test("check", () => {
            assert(b.check(true).problems).is(undefined)
            assert(b.check(false).problems).is(undefined)
            assert(b.check(0).problems?.summary).snap(
                `Must be boolean (was number)`
            )
        })
    })
    describe("bigint", () => {
        const b = type.lazy("bigint")
        test("infer", () => {
            assert(b.infer).typed as bigint
        })
        test("check", () => {
            assert(b.check(999n).problems).is(undefined)
            assert(b.check(999).problems?.summary).snap(
                `Must be a bigint (was number)`
            )
        })
    })
    describe("symbol", () => {
        const s = type.lazy("symbol")
        test("infer", () => {
            assert(s.infer).typed as symbol
        })
        test("check", () => {
            assert(s.check(Symbol("")).problems).is(undefined)
            assert(s.check("@").problems?.summary).snap(
                `Must be a symbol (was string)`
            )
        })
    })
    describe("function", () => {
        const f = type.lazy("Function")
        test("infer", () => {
            assert(f.infer).typed as Function
        })
        test("check", () => {
            assert(f.check(() => ({})).problems).is(undefined)
            assert(f.check({}).problems?.summary).snap(
                `Must be a function (was object)`
            )
        })
    })
    describe("object", () => {
        const o = type.lazy("object")
        test("infer", () => {
            assert(o.infer).typed as object
        })
        test("check", () => {
            assert(o.check([]).problems).is(undefined)
            assert(o.check({}).problems).is(undefined)
            assert(o.check(null).problems?.summary).snap(
                `Must be an object (was null)`
            )
        })
    })
    describe("undefined", () => {
        const u = type.lazy("undefined")
        test("infer", () => {
            assert(u.infer).typed as undefined
        })
        test("check", () => {
            assert(u.check(undefined).problems).is(undefined)
            assert(u.check(null).problems?.summary).snap(
                `Must be undefined (was null)`
            )
        })
    })
    describe("null", () => {
        const n = type.lazy("null")
        test("infer", () => {
            assert(n.infer).typed as null
        })
        test("check", () => {
            assert(n.check(null).problems).is(undefined)
            assert(n.check(undefined).problems?.summary).snap(
                `Must be null (was undefined)`
            )
        })
    })
    describe("void", () => {
        const v = type.lazy("void")
        test("infer", () => {
            assert(v.infer).typed as void
        })
        test("check", () => {
            assert(v.check(undefined).problems).is(undefined)
            assert(v.check(null).problems?.summary).snap(
                `Must be undefined (was null)`
            )
        })
    })
    describe("any", () => {
        const a = type.lazy("any")
        test("infer", () => {
            assert(a.infer).typed as any
        })
        test("check", () => {
            assert(a.check(-34_324n).problems).is(undefined)
            assert(a.check({ yes: "no" }).problems).is(undefined)
            assert(a.check([0, "1", 2, "3"]).problems).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = type.lazy("unknown")
        test("infer", () => {
            assert(u.infer).typed as unknown
        })
        test("check", () => {
            assert(u.check(34_324n).problems).is(undefined)
            assert(u.check({ no: "yes" }).problems).is(undefined)
            assert(u.check(["0", 1, "2", 3]).problems).is(undefined)
        })
    })
    describe("never", () => {
        const n = type.lazy("never")
        test("infer", () => {
            assert(n.infer).typed as never
        })
        test("check", () => {
            assert(n.check("sometimes").problems?.summary).snap(
                `Never allowed (was string)`
            )
            assert(n.check(undefined).problems?.summary).snap(
                `Never allowed (was undefined)`
            )
        })
    })
    describe("string", () => {
        const s = type.lazy("string")
        test("infer", () => {
            assert(s.infer).typed as string
        })
        test("check", () => {
            assert(s.check("KEKW").problems).is(undefined)
            assert(s.check(["whoops"]).problems?.summary).snap(
                `Must be a string (was array)`
            )
        })
    })
    describe("number", () => {
        const n = type.lazy("number")
        test("infer", () => {
            assert(n.infer).typed as number
        })
        test("check", () => {
            assert(n.check(-83).problems).is(undefined)
            assert(n.check(0.999).problems).is(undefined)
            assert(n.check("42").problems?.summary).snap(
                `Must be a number (was string)`
            )
            assert(n.check(Infinity).problems).is(undefined)
            assert(n.check(NaN).problems).is(undefined)
        })
    })
})

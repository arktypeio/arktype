import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("type keywords", () => {
    describe("boolean", () => {
        const b = type.lazy("boolean")
        test("infer", () => {
            attest(b.infer).typed as boolean
        })
        test("check", () => {
            attest(b.check(true).problems).is(undefined)
            attest(b.check(false).problems).is(undefined)
            attest(b.check(0).problems?.summary).snap(
                `Must be boolean (was number)`
            )
        })
    })
    describe("bigint", () => {
        const b = type.lazy("bigint")
        test("infer", () => {
            attest(b.infer).typed as bigint
        })
        test("check", () => {
            attest(b.check(999n).problems).is(undefined)
            attest(b.check(999).problems?.summary).snap(
                `Must be a bigint (was number)`
            )
        })
    })
    describe("symbol", () => {
        const s = type.lazy("symbol")
        test("infer", () => {
            attest(s.infer).typed as symbol
        })
        test("check", () => {
            attest(s.check(Symbol("")).problems).is(undefined)
            attest(s.check("@").problems?.summary).snap(
                `Must be a symbol (was string)`
            )
        })
    })
    describe("function", () => {
        const f = type.lazy("Function")
        test("infer", () => {
            attest(f.infer).typed as Function
        })
        test("check", () => {
            attest(f.check(() => ({})).problems).is(undefined)
            attest(f.check({}).problems?.summary).snap(
                `Must be a function (was object)`
            )
        })
    })
    describe("object", () => {
        const o = type.lazy("object")
        test("infer", () => {
            attest(o.infer).typed as object
        })
        test("check", () => {
            attest(o.check([]).problems).is(undefined)
            attest(o.check({}).problems).is(undefined)
            attest(o.check(null).problems?.summary).snap(
                `Must be an object (was null)`
            )
        })
    })
    describe("undefined", () => {
        const u = type.lazy("undefined")
        test("infer", () => {
            attest(u.infer).typed as undefined
        })
        test("check", () => {
            attest(u.check(undefined).problems).is(undefined)
            attest(u.check(null).problems?.summary).snap(
                `Must be undefined (was null)`
            )
        })
    })
    describe("null", () => {
        const n = type.lazy("null")
        test("infer", () => {
            attest(n.infer).typed as null
        })
        test("check", () => {
            attest(n.check(null).problems).is(undefined)
            attest(n.check(undefined).problems?.summary).snap(
                `Must be null (was undefined)`
            )
        })
    })
    describe("void", () => {
        const v = type.lazy("void")
        test("infer", () => {
            attest(v.infer).typed as void
        })
        test("check", () => {
            attest(v.check(undefined).problems).is(undefined)
            attest(v.check(null).problems?.summary).snap(
                `Must be undefined (was null)`
            )
        })
    })
    describe("any", () => {
        const a = type.lazy("any")
        test("infer", () => {
            attest(a.infer).typed as any
        })
        test("check", () => {
            attest(a.check(-34_324n).problems).is(undefined)
            attest(a.check({ yes: "no" }).problems).is(undefined)
            attest(a.check([0, "1", 2, "3"]).problems).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = type.lazy("unknown")
        test("infer", () => {
            attest(u.infer).typed as unknown
        })
        test("check", () => {
            attest(u.check(34_324n).problems).is(undefined)
            attest(u.check({ no: "yes" }).problems).is(undefined)
            attest(u.check(["0", 1, "2", 3]).problems).is(undefined)
        })
    })
    describe("never", () => {
        const n = type.lazy("never")
        test("infer", () => {
            attest(n.infer).typed as never
        })
        test("check", () => {
            attest(n.check("sometimes").problems?.summary).snap(
                `Never allowed (was string)`
            )
            attest(n.check(undefined).problems?.summary).snap(
                `Never allowed (was undefined)`
            )
        })
    })
    describe("string", () => {
        const s = type.lazy("string")
        test("infer", () => {
            attest(s.infer).typed as string
        })
        test("check", () => {
            attest(s.check("KEKW").problems).is(undefined)
            attest(s.check(["whoops"]).problems?.summary).snap(
                `Must be a string (was array)`
            )
        })
    })
    describe("number", () => {
        const n = type.lazy("number")
        test("infer", () => {
            attest(n.infer).typed as number
        })
        test("check", () => {
            attest(n.check(-83).problems).is(undefined)
            attest(n.check(0.999).problems).is(undefined)
            attest(n.check("42").problems?.summary).snap(
                `Must be a number (was string)`
            )
            attest(n.check(Infinity).problems).is(undefined)
            attest(n.check(NaN).problems).is(undefined)
        })
    })
})

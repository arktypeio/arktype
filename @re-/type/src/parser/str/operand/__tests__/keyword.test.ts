import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"

describe("keyword", () => {
    describe("boolean", () => {
        const b = type("boolean")
        test("type", () => {
            assert(b.infer).typed as boolean
        })
        test("generation", () => {
            assert(b.create()).is(false)
        })
        test("validation", () => {
            assert(b.check(true).errors).is(undefined)
            assert(b.check(false).errors).is(undefined)
            assert(b.check(0).errors?.summary).snap(
                `Must be a boolean (was number).`
            )
        })
    })
    describe("true", () => {
        const t = type("true")
        test("type", () => {
            assert(t.infer).typed as true
        })
        test("generation", () => {
            assert(t.create()).is(true)
        })
        test("validation", () => {
            assert(t.check(true).errors).is(undefined)
            assert(t.check(false).errors?.summary).snap(
                `Must be true (was false).`
            )
        })
    })
    describe("false", () => {
        const f = type("false")
        test("type", () => {
            assert(f.infer).typed as false
        })
        test("generation", () => {
            assert(f.create()).is(false)
        })
        test("validation", () => {
            assert(f.check(false).errors).is(undefined)
            assert(f.check(true).errors?.summary).snap(
                `Must be false (was true).`
            )
        })
    })
    describe("bigint", () => {
        const b = type("bigint")
        test("type", () => {
            assert(b.infer).typed as bigint
        })
        test("generation", () => {
            assert(b.create()).is(0n)
        })
        test("validation", () => {
            assert(b.check(999n).errors).is(undefined)
            assert(b.check(999).errors?.summary).snap(
                `Must be a bigint (was number).`
            )
        })
    })
    describe("symbol", () => {
        const s = type("symbol")
        test("type", () => {
            assert(s.infer).typed as symbol
        })
        test("generation", () => {
            assert(typeof s.create()).is("symbol")
        })
        test("validation", () => {
            assert(s.check(Symbol("")).errors).is(undefined)
            assert(s.check("@").errors?.summary).snap(
                `Must be a symbol (was string).`
            )
        })
    })
    describe("function", () => {
        const f = type("function")
        test("type", () => {
            assert(f.infer).typed as Function
        })
        test("generation", () => {
            assert(typeof f.create()).equals("function")
        })
        test("validation", () => {
            assert(f.check(() => ({})).errors).is(undefined)
            assert(f.check({}).errors?.summary).snap(
                `Must be a function (was object).`
            )
        })
    })
    describe("object", () => {
        const o = type("object")
        test("type", () => {
            assert(o.infer).typed as object
        })
        test("generation", () => {
            assert(o.create()).equals({})
        })
        test("validation", () => {
            assert(o.check([]).errors).is(undefined)
            assert(o.check({}).errors).is(undefined)
            assert(o.check(null).errors?.summary).snap(
                `Must be an object (was null).`
            )
        })
    })
    describe("undefined", () => {
        const u = type("undefined")
        test("type", () => {
            assert(u.infer).typed as undefined
        })
        test("generation", () => {
            assert(u.create()).is(undefined)
        })
        test("validation", () => {
            assert(u.check(undefined).errors).is(undefined)
            assert(u.check(null).errors?.summary).snap(
                `Must be undefined (was null).`
            )
        })
    })
    describe("null", () => {
        const n = type("null")
        test("type", () => {
            assert(n.infer).typed as null
        })
        test("generation", () => {
            assert(n.create()).is(null)
        })
        test("validation", () => {
            assert(n.check(null).errors).is(undefined)
            assert(n.check(undefined).errors?.summary).snap(
                `Must be null (was undefined).`
            )
        })
    })
    describe("void", () => {
        const v = type("void")
        test("type", () => {
            assert(v.infer).typed as void
        })
        test("generation", () => {
            assert(v.create()).is(undefined)
        })
        test("validation", () => {
            assert(v.check(undefined).errors).is(undefined)
            assert(v.check(null).errors?.summary).snap(
                `Must be a void (was null).`
            )
        })
    })
    describe("any", () => {
        const a = type("any")
        test("type", () => {
            assert(a.infer).typed as any
        })
        test("generation", () => {
            assert(a.create()).is(undefined)
        })
        test("validation", () => {
            assert(a.check(-34_324n).errors).is(undefined)
            assert(a.check({ yes: "no" }).errors).is(undefined)
            assert(a.check([0, "1", 2, "3"]).errors).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = type("unknown")
        test("type", () => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            assert(u.infer).typed as unknown
        })
        test("generation", () => {
            assert(u.create()).is(undefined)
        })
        test("validation", () => {
            assert(u.check(34_324n).errors).is(undefined)
            assert(u.check({ no: "yes" }).errors).is(undefined)
            assert(u.check(["0", 1, "2", 3]).errors).is(undefined)
        })
    })
    describe("never", () => {
        const n = type("never")
        test("type", () => {
            // @ts-ignore
            assert(n.infer).typed as never
        })
        test("generation", () => {
            assert(() => n.create()).throws.snap(
                `Error: Unable to generate a value for 'never': never is ungeneratable by definition.`
            )
        })
        test("validation", () => {
            assert(n.check("sometimes").errors?.summary).snap(
                `Must be never (was string).`
            )
            assert(n.check(undefined).errors?.summary).snap(
                `Must be never (was undefined).`
            )
        })
    })
    describe("string subtypes", () => {
        describe("string", () => {
            const s = type("string")
            test("type", () => {
                assert(s.infer).typed as string
            })
            test("generation", () => {
                assert(s.create()).is("")
            })
            test("validation", () => {
                assert(s.check("KEKW").errors).is(undefined)
                assert(s.check(["whoops"]).errors?.summary).snap(
                    `Must be a string (was object).`
                )
            })
        })
        test("email", () => {
            const email = type("email")
            assert(email.infer).typed as string
            assert(email.check("david@redo.dev").errors).is(undefined)
            assert(email.check("david@redo@dev").errors?.summary).snap(
                `'david@redo@dev' must be a valid email.`
            )
        })
        test("alpha", () => {
            const alpha = type("alpha")
            assert(alpha.infer).typed as string
            assert(alpha.check("aBc").errors).is(undefined)
            assert(alpha.check("a B c").errors?.summary).snap(
                `'a B c' must include only letters.`
            )
        })
        test("alphanum", () => {
            const alphaNumeric = type("alphanumeric")
            assert(alphaNumeric.infer).typed as string
            assert(alphaNumeric.check("aBc123").errors).is(undefined)
            assert(alphaNumeric.check("aBc+123").errors?.summary).snap(
                `'aBc+123' must include only letters and digits.`
            )
        })
        test("lower", () => {
            const lowercase = type("lower")
            assert(lowercase.infer).typed as string
            assert(lowercase.check("alllowercase").errors).is(undefined)
            assert(lowercase.check("whoOps").errors?.summary).snap(
                `'whoOps' must include only lowercase letters.`
            )
        })
        test("upper", () => {
            const uppercase = type("upper")
            assert(uppercase.infer).typed as string
            assert(uppercase.check("ALLUPPERCASE").errors).is(undefined)
            assert(uppercase.check("WHOoPS").errors?.summary).snap(
                `'WHOoPS' must include only uppercase letters.`
            )
        })
    })
    describe("number", () => {
        describe("number", () => {
            const n = type("number")
            test("type", () => {
                assert(n.infer).typed as number
            })
            test("generation", () => {
                assert(n.create()).is(0)
            })
            test("validation", () => {
                assert(n.check(-83).errors).is(undefined)
                assert(n.check(0.999).errors).is(undefined)
                assert(n.check("42").errors?.summary).snap(
                    `Must be a number (was string).`
                )
                assert(n.check(Infinity).errors).is(undefined)
                assert(n.check(NaN).errors).is(undefined)
            })
        })
        describe("subtypes", () => {
            test("integer", () => {
                const integer = type("integer")
                assert(integer.infer).typed as number
                assert(integer.check(5).errors).is(undefined)
                assert(integer.check(5.0001).errors?.summary).snap(
                    `'5.0001' must must be an integer.`
                )
                assert(integer.check(Infinity).errors?.summary).snap(
                    `'Infinity' must must be an integer.`
                )
                assert(integer.check(NaN).errors?.summary).snap(
                    `'NaN' must must be an integer.`
                )
            })
        })
    })
})

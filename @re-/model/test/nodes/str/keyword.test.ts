import { assert } from "@re-/assert"
import { model } from "../../../src/index.js"

describe("keyword", () => {
    describe("string", () => {
        const s = model("string")
        it("type", () => {
            assert(s.type).typed as string
        })
        it("generation", () => {
            assert(s.generate()).is("")
        })
        it("validation", () => {
            assert(s.validate("KEKW").error).is(undefined)
            assert(s.validate(["whoops"]).error).snap(
                `['whoops'] is not assignable to string.`
            )
        })
    })
    describe("number", () => {
        const n = model("number")
        it("type", () => {
            assert(n.type).typed as number
        })
        it("generation", () => {
            assert(n.generate()).is(0)
        })
        it("validation", () => {
            assert(n.validate(-83).error).is(undefined)
            assert(n.validate(0.999).error).is(undefined)
            assert(n.validate("42").error).snap(
                `'42' is not assignable to number.`
            )
        })
    })
    describe("boolean", () => {
        const b = model("boolean")
        it("type", () => {
            assert(b.type).typed as boolean
        })
        it("generation", () => {
            assert(b.generate()).is(false)
        })
        it("validation", () => {
            assert(b.validate(true).error).is(undefined)
            assert(b.validate(false).error).is(undefined)
            assert(b.validate(0).error).snap(`0 is not assignable to boolean.`)
        })
    })
    describe("true", () => {
        const t = model("true")
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
        const f = model("false")
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
    describe("bigint", () => {
        const b = model("bigint")
        it("type", () => {
            assert(b.type).typed as bigint
        })
        it("generation", () => {
            assert(b.generate()).is(0n)
        })
        it("validation", () => {
            assert(b.validate(999n).error).is(undefined)
            assert(b.validate(999).error).snap(
                `999 is not assignable to bigint.`
            )
        })
    })
    describe("symbol", () => {
        const s = model("symbol")
        it("type", () => {
            assert(s.type).typed as symbol
        })
        it("generation", () => {
            assert(typeof s.generate()).is("symbol")
        })
        it("validation", () => {
            assert(s.validate(Symbol("")).error).is(undefined)
            assert(s.validate("@").error).snap(
                `'@' is not assignable to symbol.`
            )
        })
    })
    describe("function", () => {
        const f = model("function")
        it("type", () => {
            assert(f.type).typed as (...args: any[]) => any
        })
        it("generation", () => {
            assert(typeof f.generate()).equals("function")
        })
        it("validation", () => {
            assert(f.validate(() => ({})).error).is(undefined)
            assert(f.validate({}).error).snap(
                `{} is not assignable to function.`
            )
        })
    })
    describe("object", () => {
        const o = model("object")
        it("type", () => {
            assert(o.type).typed as object
        })
        it("generation", () => {
            assert(o.generate()).equals({})
        })
        it("validation", () => {
            assert(o.validate([]).error).is(undefined)
            assert(o.validate({}).error).is(undefined)
            assert(o.validate(null).error).snap(
                `null is not assignable to object.`
            )
        })
    })
    describe("undefined", () => {
        const u = model("undefined")
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
        const n = model("null")
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
    describe("void", () => {
        const v = model("void")
        it("type", () => {
            assert(v.type).typed as void
        })
        it("generation", () => {
            assert(v.generate()).is(undefined)
        })
        it("validation", () => {
            assert(v.validate(undefined).error).is(undefined)
            assert(v.validate(null).error).snap(
                `null is not assignable to void.`
            )
        })
    })
    describe("any", () => {
        const a = model("any")
        it("type", () => {
            assert(a.type).typed as any
        })
        it("generation", () => {
            assert(a.generate()).is(undefined)
        })
        it("validation", () => {
            assert(a.validate(-34_324n).error).is(undefined)
            assert(a.validate({ yes: "no" }).error).is(undefined)
            assert(a.validate([0, "1", 2, "3"]).error).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = model("unknown")
        it("type", () => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            assert(u.type).typed as unknown
        })
        it("generation", () => {
            assert(u.generate()).is(undefined)
        })
        it("validation", () => {
            assert(u.validate(34_324n).error).is(undefined)
            assert(u.validate({ no: "yes" }).error).is(undefined)
            assert(u.validate(["0", 1, "2", 3]).error).is(undefined)
        })
    })
    describe("never", () => {
        const n = model("never")
        it("type", () => {
            // @ts-ignore
            assert(n.type).typed as never
        })
        it("generation", () => {
            assert(() => n.generate()).throws.snap(
                `Error: Unable to generate a value for 'never': never is ungeneratable by definition.`
            )
        })
        it("validation", () => {
            assert(n.validate("sometimes").error).snap(
                `'sometimes' is not assignable to never.`
            )
            assert(n.validate(undefined).error).snap(
                `undefined is not assignable to never.`
            )
        })
    })
    describe("string subtypes", () => {
        it("email", () => {
            const email = model("email")
            assert(email.type).typed as string
            assert(email.validate("david@redo.dev").error).is(undefined)
            assert(email.validate("david@redo@dev").error).snap(
                `'david@redo@dev' is not assignable to email.`
            )
        })
        it("alpha", () => {
            const alpha = model("alpha")
            assert(alpha.type).typed as string
            assert(alpha.validate("aBc").error).is(undefined)
            assert(alpha.validate("a B c").error).snap(
                `'a B c' is not assignable to alpha.`
            )
        })
        it("alphanumeric", () => {
            const alphaNumeric = model("alphanumeric")
            assert(alphaNumeric.type).typed as string
            assert(alphaNumeric.validate("aBc123").error).is(undefined)
            assert(alphaNumeric.validate("aBc+123").error).snap(
                `'aBc+123' is not assignable to alphanumeric.`
            )
        })
        it("lowercase", () => {
            const lowercase = model("lowercase")
            assert(lowercase.type).typed as string
            assert(lowercase.validate("as long as no uppercase").error).is(
                undefined
            )
            assert(lowercase.validate("whoOps").error).snap(
                `'whoOps' is not assignable to lowercase.`
            )
        })
        it("uppercase", () => {
            const uppercase = model("uppercase")
            assert(uppercase.type).typed as string
            assert(uppercase.validate("AS LONG AS NO LOWERCASE").error).is(
                undefined
            )
            assert(uppercase.validate("WHOoPS").error).snap(
                `'WHOoPS' is not assignable to uppercase.`
            )
        })
        it("character", () => {
            const character = model("character")
            assert(character.type).typed as string
            assert(character.validate("!").error).is(undefined)
            assert(character.validate(":(").error).snap(
                `':(' is not assignable to character.`
            )
        })
    })
    describe("number subtypes", () => {
        it("integer", () => {
            const integer = model("integer")
            assert(integer.type).typed as number
            assert(integer.validate(5).error).is(undefined)
            assert(integer.validate(5.0001).error).snap(
                `5.0001 is not assignable to integer.`
            )
        })
        it("positive", () => {
            const positive = model("positive")
            assert(positive.type).typed as number
            assert(positive.validate(0.0001).error).is(undefined)
            assert(positive.validate(-0.0001).error).snap(
                `-0.0001 is not assignable to positive.`
            )
        })
        it("nonNegative", () => {
            const nonNegative = model("nonnegative")
            assert(nonNegative.type).typed as number
            assert(nonNegative.validate(0).error).is(undefined)
            assert(nonNegative.validate(-999).error).snap(
                `-999 is not assignable to nonnegative.`
            )
        })
    })
})

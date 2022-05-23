import { assert } from "@re-/assert"
import { model } from "@re-/model"

export const testKeyword = () => {
    describe("string", () => {
        const s = model("string")
        test("type", () => {
            assert(s.type).typed as string
        })
        test("generation", () => {
            assert(s.generate()).is("")
        })
        test("validation", () => {
            assert(s.validate("KEKW").error).is(undefined)
            assert(s.validate(["whoops"]).error).snap(
                `"['whoops'] is not assignable to string."`
            )
        })
    })
    describe("number", () => {
        const n = model("number")
        test("type", () => {
            assert(n.type).typed as number
        })
        test("generation", () => {
            assert(n.generate()).is(0)
        })
        test("validation", () => {
            assert(n.validate(-83).error).is(undefined)
            assert(n.validate(0.999).error).is(undefined)
            assert(n.validate("42").error).snap(
                `"'42' is not assignable to number."`
            )
        })
    })
    describe("boolean", () => {
        const b = model("boolean")
        test("type", () => {
            assert(b.type).typed as boolean
        })
        test("generation", () => {
            assert(b.generate()).is(false)
        })
        test("validation", () => {
            assert(b.validate(true).error).is(undefined)
            assert(b.validate(false).error).is(undefined)
            assert(b.validate(0).error).snap(
                `"0 is not assignable to boolean."`
            )
        })
    })
    describe("true", () => {
        const t = model("true")
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
        const f = model("false")
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
    describe("bigint", () => {
        const b = model("bigint")
        test("type", () => {
            assert(b.type).typed as bigint
        })
        test("generation", () => {
            assert(b.generate()).is(0n)
        })
        test("validation", () => {
            assert(b.validate(999n).error).is(undefined)
            assert(b.validate(999).error).snap(
                `"999 is not assignable to bigint."`
            )
        })
    })
    describe("symbol", () => {
        const s = model("symbol")
        test("type", () => {
            assert(s.type).typed as symbol
        })
        test("generation", () => {
            assert(typeof s.generate()).is("symbol")
        })
        test("validation", () => {
            assert(s.validate(Symbol("")).error).is(undefined)
            assert(s.validate("@").error).snap(
                `"'@' is not assignable to symbol."`
            )
        })
    })
    describe("function", () => {
        const f = model("function")
        test("type", () => {
            assert(f.type).typed as (...args: any[]) => any
        })
        test("generation", () => {
            const generated = f.generate()
            assert(typeof generated).is("function")
            assert(generated("irrelevant")).is(undefined)
        })
        test("validation", () => {
            assert(f.validate(() => ({})).error).is(undefined)
            assert(f.validate({}).error).snap(
                `"{} is not assignable to function."`
            )
        })
    })
    describe("object", () => {
        const o = model("object")
        test("type", () => {
            assert(o.type).typed as object
        })
        test("generation", () => {
            assert(o.generate()).equals({})
        })
        test("validation", () => {
            assert(o.validate([]).error).is(undefined)
            assert(o.validate({}).error).is(undefined)
            assert(o.validate(null).error).snap(
                `"null is not assignable to object."`
            )
        })
    })
    describe("undefined", () => {
        const u = model("undefined")
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
        const n = model("null")
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
    describe("void", () => {
        const v = model("void")
        test("type", () => {
            assert(v.type).typed as void
        })
        test("generation", () => {
            assert(v.generate()).is(undefined)
        })
        test("validation", () => {
            assert(v.validate(undefined).error).is(undefined)
            assert(v.validate(null).error).snap(
                `"null is not assignable to void."`
            )
        })
    })
    describe("any", () => {
        const a = model("any")
        test("type", () => {
            assert(a.type).typed as any
        })
        test("generation", () => {
            assert(a.generate()).is(undefined)
        })
        test("validation", () => {
            assert(a.validate(-34324n).error).is(undefined)
            assert(a.validate({ yes: "no" }).error).is(undefined)
            assert(a.validate([0, "1", 2, "3"]).error).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = model("unknown")
        test("type", () => {
            // eslint-disable-next-line
            assert(u.type).typed as unknown
        })
        test("generation", () => {
            assert(u.generate()).is(undefined)
        })
        test("validation", () => {
            assert(u.validate(34324n).error).is(undefined)
            assert(u.validate({ no: "yes" }).error).is(undefined)
            assert(u.validate(["0", 1, "2", 3]).error).is(undefined)
        })
    })
    describe("never", () => {
        const n = model("never")
        test("type", () => {
            // @ts-ignore
            assert(n.type).typed as never
        })
        test("generation", () => {
            assert(() => n.generate()).throws(
                "Could not find a default value satisfying never."
            )
        })
        test("validation", () => {
            assert(n.validate("sometimes").error).snap(
                `"'sometimes' is not assignable to never."`
            )
            assert(n.validate(undefined).error).snap(
                `"undefined is not assignable to never."`
            )
        })
    })
    describe("string subtypes", () => {
        test("email", () => {
            const email = model("email")
            assert(email.type).typed as string
            assert(email.validate("david@redo.dev").error).is(undefined)
            assert(email.validate("david@redo@dev").error).snap(
                `"'david@redo@dev' is not assignable to email."`
            )
        })
        test("alpha", () => {
            const alpha = model("alpha")
            assert(alpha.type).typed as string
            assert(alpha.validate("aBc").error).is(undefined)
            assert(alpha.validate("a B c").error).snap(
                `"'a B c' is not assignable to alpha."`
            )
        })
        test("alphanumeric", () => {
            const alphaNumeric = model("alphanumeric")
            assert(alphaNumeric.type).typed as string
            assert(alphaNumeric.validate("aBc123").error).is(undefined)
            assert(alphaNumeric.validate("aBc+123").error).snap(
                `"'aBc+123' is not assignable to alphanumeric."`
            )
        })
        test("lowercase", () => {
            const lowercase = model("lowercase")
            assert(lowercase.type).typed as string
            assert(lowercase.validate("as long as no uppercase").error).is(
                undefined
            )
            assert(lowercase.validate("whoOps").error).snap(
                `"'whoOps' is not assignable to lowercase."`
            )
        })
        test("uppercase", () => {
            const uppercase = model("uppercase")
            assert(uppercase.type).typed as string
            assert(uppercase.validate("AS LONG AS NO LOWERCASE").error).is(
                undefined
            )
            assert(uppercase.validate("WHOoPS").error).snap(
                `"'WHOoPS' is not assignable to uppercase."`
            )
        })
        test("character", () => {
            const character = model("character")
            assert(character.type).typed as string
            assert(character.validate("!").error).is(undefined)
            assert(character.validate(":(").error).snap(
                `"':(' is not assignable to character."`
            )
        })
    })
    describe("number subtypes", () => {
        test("integer", () => {
            const integer = model("integer")
            assert(integer.type).typed as number
            assert(integer.validate(5.0).error).is(undefined)
            assert(integer.validate(5.0001).error).snap(
                `"5.0001 is not assignable to integer."`
            )
        })
        test("positive", () => {
            const positive = model("positive")
            assert(positive.type).typed as number
            assert(positive.validate(0.0001).error).is(undefined)
            assert(positive.validate(-0.0001).error).snap(
                `"-0.0001 is not assignable to positive."`
            )
        })
        test("nonNegative", () => {
            const nonNegative = model("nonnegative")
            assert(nonNegative.type).typed as number
            assert(nonNegative.validate(0).error).is(undefined)
            assert(nonNegative.validate(-999).error).snap(
                `"-999 is not assignable to nonnegative."`
            )
        })
    })
}

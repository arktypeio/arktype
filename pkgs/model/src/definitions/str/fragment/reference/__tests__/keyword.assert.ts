import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testKeyword = () => {
    describe("string", () => {
        const { type, generate, validate } = create("string")
        test("type", () => {
            assert(type).typed as string
        })
        test("generation", () => {
            assert(generate()).is("")
        })
        test("validation", () => {
            assert(validate("KEKW").error).is(undefined)
            assert(validate(["whoops"]).error).snap(
                `"['whoops'] is not assignable to string."`
            )
        })
    })
    describe("number", () => {
        const { type, generate, validate } = create("number")
        test("type", () => {
            assert(type).typed as number
        })
        test("generation", () => {
            assert(generate()).is(0)
        })
        test("validation", () => {
            assert(validate(-83).error).is(undefined)
            assert(validate(0.999).error).is(undefined)
            assert(validate("42").error).snap(
                `"'42' is not assignable to number."`
            )
        })
    })
    describe("boolean", () => {
        const { type, generate, validate } = create("boolean")
        test("type", () => {
            assert(type).typed as boolean
        })
        test("generation", () => {
            assert(generate()).is(false)
        })
        test("validation", () => {
            assert(validate(true).error).is(undefined)
            assert(validate(false).error).is(undefined)
            assert(validate(0).error).snap(`"0 is not assignable to boolean."`)
        })
    })
    describe("true", () => {
        const { type, generate, validate } = create("true")
        test("type", () => {
            assert(type).typed as true
        })
        test("generation", () => {
            assert(generate()).is(true)
        })
        test("validation", () => {
            assert(validate(true).error).is(undefined)
            assert(validate(false).error).snap(
                `"false is not assignable to true."`
            )
        })
    })
    describe("false", () => {
        const { type, generate, validate } = create("false")
        test("type", () => {
            assert(type).typed as false
        })
        test("generation", () => {
            assert(generate()).is(false)
        })
        test("validation", () => {
            assert(validate(false).error).is(undefined)
            assert(validate(true).error).snap(
                `"true is not assignable to false."`
            )
        })
    })
    describe("bigint", () => {
        const { type, generate, validate } = create("bigint")
        test("type", () => {
            assert(type).typed as bigint
        })
        test("generation", () => {
            assert(generate()).is(0n)
        })
        test("validation", () => {
            assert(validate(999n).error).is(undefined)
            assert(validate(999).error).snap(
                `"999 is not assignable to bigint."`
            )
        })
    })
    describe("symbol", () => {
        const { type, generate, validate } = create("symbol")
        test("type", () => {
            assert(type).typed as symbol
        })
        test("generation", () => {
            assert(typeof generate()).is("symbol")
        })
        test("validation", () => {
            assert(validate(Symbol("")).error).is(undefined)
            assert(validate("@").error).snap(
                `"'@' is not assignable to symbol."`
            )
        })
    })
    describe("function", () => {
        const { type, generate, validate } = create("function")
        test("type", () => {
            assert(type).typed as (...args: any[]) => any
        })
        test("generation", () => {
            const generated = generate()
            assert(typeof generated).is("function")
            assert(generated("irrelevant")).is(undefined)
        })
        test("validation", () => {
            assert(validate(() => {}).error).is(undefined)
            assert(validate({}).error).snap(
                `"{} is not assignable to function."`
            )
        })
    })
    describe("object", () => {
        const { type, generate, validate } = create("object")
        test("type", () => {
            assert(type).typed as object
        })
        test("generation", () => {
            assert(generate()).equals({})
        })
        test("validation", () => {
            assert(validate([]).error).is(undefined)
            assert(validate({}).error).is(undefined)
            assert(validate(null).error).snap(
                `"null is not assignable to object."`
            )
        })
    })
    describe("undefined", () => {
        const { type, generate, validate } = create("undefined")
        test("type", () => {
            assert(type).typed as undefined
        })
        test("generation", () => {
            assert(generate()).is(undefined)
        })
        test("validation", () => {
            assert(validate(undefined).error).is(undefined)
            assert(validate(null).error).snap(
                `"null is not assignable to undefined."`
            )
        })
    })
    describe("null", () => {
        const { type, generate, validate } = create("null")
        test("type", () => {
            assert(type).typed as null
        })
        test("generation", () => {
            assert(generate()).is(null)
        })
        test("validation", () => {
            assert(validate(null).error).is(undefined)
            assert(validate(undefined).error).snap(
                `"undefined is not assignable to null."`
            )
        })
    })
    describe("void", () => {
        const { type, generate, validate } = create("void")
        test("type", () => {
            assert(type).typed as void
        })
        test("generation", () => {
            assert(generate()).is(undefined)
        })
        test("validation", () => {
            assert(validate(undefined).error).is(undefined)
            assert(validate(null).error).snap(
                `"null is not assignable to void."`
            )
        })
    })
    describe("any", () => {
        const { type, generate, validate } = create("any")
        test("type", () => {
            assert(type).typed as any
        })
        test("generation", () => {
            assert(generate()).is(undefined)
        })
        test("validation", () => {
            assert(validate(-34324n).error).is(undefined)
            assert(validate({ yes: "no" }).error).is(undefined)
            assert(validate([0, "1", 2, "3"]).error).is(undefined)
        })
    })
    describe("unknown", () => {
        const { type, generate, validate } = create("unknown")
        test("type", () => {
            assert(type).typed as unknown
        })
        test("generation", () => {
            assert(generate()).is(undefined)
        })
        test("validation", () => {
            assert(validate(34324n).error).is(undefined)
            assert(validate({ no: "yes" }).error).is(undefined)
            assert(validate(["0", 1, "2", 3]).error).is(undefined)
        })
    })
    describe("never", () => {
        const { type, generate, validate } = create("never")
        test("type", () => {
            // @ts-ignore
            assert(type).typed as never
        })
        test("generation", () => {
            assert(() => generate()).throws(
                "Could not find a default value satisfying never."
            )
        })
        test("validation", () => {
            assert(validate("sometimes").error).snap(
                `"'sometimes' is not assignable to never."`
            )
            assert(validate(undefined).error).snap(
                `"undefined is not assignable to never."`
            )
        })
    })
    describe("string subtypes", () => {
        test("email", () => {
            const email = create("email")
            assert(email.type).typed as string
            assert(email.validate("david@redo.dev").error).is(undefined)
            assert(email.validate("david@redo@dev").error).snap(
                `"'david@redo@dev' is not assignable to email."`
            )
        })
        test("alpha", () => {
            const alpha = create("alpha")
            assert(alpha.type).typed as string
            assert(alpha.validate("aBc").error).is(undefined)
            assert(alpha.validate("a B c").error).snap(
                `"'a B c' is not assignable to alpha."`
            )
        })
        test("alphanumeric", () => {
            const alphaNumeric = create("alphanumeric")
            assert(alphaNumeric.type).typed as string
            assert(alphaNumeric.validate("aBc123").error).is(undefined)
            assert(alphaNumeric.validate("aBc+123").error).snap(
                `"'aBc+123' is not assignable to alphanumeric."`
            )
        })
        test("lowercase", () => {
            const lowercase = create("lowercase")
            assert(lowercase.type).typed as string
            assert(lowercase.validate("as long as no uppercase").error).is(
                undefined
            )
            assert(lowercase.validate("whoOps").error).snap(
                `"'whoOps' is not assignable to lowercase."`
            )
        })
        test("uppercase", () => {
            const uppercase = create("uppercase")
            assert(uppercase.type).typed as string
            assert(uppercase.validate("AS LONG AS NO LOWERCASE").error).is(
                undefined
            )
            assert(uppercase.validate("WHOoPS").error).snap(
                `"'WHOoPS' is not assignable to uppercase."`
            )
        })
        test("character", () => {
            const character = create("character")
            assert(character.type).typed as string
            assert(character.validate("!").error).is(undefined)
            assert(character.validate(":(").error).snap(
                `"':(' is not assignable to character."`
            )
        })
    })
    describe("number subtypes", () => {
        test("integer", () => {
            const integer = create("integer")
            assert(integer.type).typed as number
            assert(integer.validate(5.0).error).is(undefined)
            assert(integer.validate(5.0001).error).snap(
                `"5.0001 is not assignable to integer."`
            )
        })
        test("positive", () => {
            const positive = create("positive")
            assert(positive.type).typed as number
            assert(positive.validate(0.0001).error).is(undefined)
            assert(positive.validate(-0.0001).error).snap(
                `"-0.0001 is not assignable to positive."`
            )
        })
        test("nonNegative", () => {
            const nonNegative = create("nonnegative")
            assert(nonNegative.type).typed as number
            assert(nonNegative.validate(0).error).is(undefined)
            assert(nonNegative.validate(-999).error).snap(
                `"-999 is not assignable to nonnegative."`
            )
        })
    })
}

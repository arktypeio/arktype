import { assert } from "@re-/assert"
import { describe, test } from "vitest"
import { type } from "../../index.js"

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
            assert(b.validate(true).error).is(undefined)
            assert(b.validate(false).error).is(undefined)
            assert(b.validate(0).error?.message).snap(
                `0 is not assignable to boolean.`
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
            assert(t.validate(true).error).is(undefined)
            assert(t.validate(false).error?.message).snap(
                `false is not assignable to true.`
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
            assert(f.validate(false).error).is(undefined)
            assert(f.validate(true).error?.message).snap(
                `true is not assignable to false.`
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
            assert(b.validate(999n).error).is(undefined)
            assert(b.validate(999).error?.message).snap(
                `999 is not assignable to bigint.`
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
            assert(s.validate(Symbol("")).error).is(undefined)
            assert(s.validate("@").error?.message).snap(
                `"@" is not assignable to symbol.`
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
            assert(f.validate(() => ({})).error).is(undefined)
            assert(f.validate({}).error?.message).snap(
                `{} is not assignable to function.`
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
            assert(o.validate([]).error).is(undefined)
            assert(o.validate({}).error).is(undefined)
            assert(o.validate(null).error?.message).snap(
                `null is not assignable to object.`
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
            assert(u.validate(undefined).error).is(undefined)
            assert(u.validate(null).error?.message).snap(
                `null is not assignable to undefined.`
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
            assert(n.validate(null).error).is(undefined)
            assert(n.validate(undefined).error?.message).snap(
                `undefined is not assignable to null.`
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
            assert(v.validate(undefined).error).is(undefined)
            assert(v.validate(null).error?.message).snap(
                `null is not assignable to void.`
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
            assert(a.validate(-34_324n).error).is(undefined)
            assert(a.validate({ yes: "no" }).error).is(undefined)
            assert(a.validate([0, "1", 2, "3"]).error).is(undefined)
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
            assert(u.validate(34_324n).error).is(undefined)
            assert(u.validate({ no: "yes" }).error).is(undefined)
            assert(u.validate(["0", 1, "2", 3]).error).is(undefined)
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
            assert(n.validate("sometimes").error?.message).snap(
                `"sometimes" is not assignable to never.`
            )
            assert(n.validate(undefined).error?.message).snap(
                `undefined is not assignable to never.`
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
                assert(s.validate("KEKW").error).is(undefined)
                assert(s.validate(["whoops"]).error?.message).snap(
                    `["whoops"] is not assignable to string.`
                )
            })
        })
        test("email", () => {
            const email = type("email")
            assert(email.infer).typed as string
            assert(email.validate("david@redo.dev").error).is(undefined)
            assert(email.validate("david@redo@dev").error?.message).snap(
                `"david@redo@dev" is not assignable to email.`
            )
        })
        test("alpha", () => {
            const alpha = type("alpha")
            assert(alpha.infer).typed as string
            assert(alpha.validate("aBc").error).is(undefined)
            assert(alpha.validate("a B c").error?.message).snap(
                `"a B c" is not assignable to alpha.`
            )
        })
        test("alphanum", () => {
            const alphaNumeric = type("alphanum")
            assert(alphaNumeric.infer).typed as string
            assert(alphaNumeric.validate("aBc123").error).is(undefined)
            assert(alphaNumeric.validate("aBc+123").error?.message).snap(
                `"aBc+123" is not assignable to alphanum.`
            )
        })
        test("lower", () => {
            const lowercase = type("lower")
            assert(lowercase.infer).typed as string
            assert(lowercase.validate("as long as no uppercase").error).is(
                undefined
            )
            assert(lowercase.validate("whoOps").error?.message).snap(
                `"whoOps" is not assignable to lower.`
            )
        })
        test("upper", () => {
            const uppercase = type("upper")
            assert(uppercase.infer).typed as string
            assert(uppercase.validate("AS LONG AS NO LOWERCASE").error).is(
                undefined
            )
            assert(uppercase.validate("WHOoPS").error?.message).snap(
                `"WHOoPS" is not assignable to upper.`
            )
        })
        // test("char", () => {
        //     const character = model("char")
        //     assert(character.type).typed as string
        //     assert(character.validate("!").error).is(undefined)
        //     assert(character.validate(":(").error?.message).snap(
        //         `":(" is not assignable to char.`
        //     )
        // })
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
                assert(n.validate(-83).error).is(undefined)
                assert(n.validate(0.999).error).is(undefined)
                assert(n.validate("42").error?.message).snap(
                    `"42" is not assignable to number.`
                )
                assert(n.validate(Infinity).error).is(undefined)
                assert(n.validate(NaN).error).is(undefined)
            })
        })
        describe("subtypes", () => {
            test("integer", () => {
                const integer = type("integer")
                assert(integer.infer).typed as number
                assert(integer.validate(5).error).is(undefined)
                assert(integer.validate(5.0001).error?.message).snap(
                    `5.0001 is not assignable to integer.`
                )
                assert(integer.validate(Infinity).error?.message).snap(
                    `Infinity is not assignable to integer.`
                )
                assert(integer.validate(NaN).error?.message).snap(
                    `NaN is not assignable to integer.`
                )
            })
        })
    })
})

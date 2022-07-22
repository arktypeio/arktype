import { assert } from "@re-/assert"
import { type } from "../../src/index.js"

describe("keyword", () => {
    describe("boolean", () => {
        const b = type("boolean")
        it("type", () => {
            assert(b.infer).typed as boolean
        })
        it("generation", () => {
            assert(b.create()).is(false)
        })
        it("validation", () => {
            assert(b.validate(true).error).is(undefined)
            assert(b.validate(false).error).is(undefined)
            assert(b.validate(0).error?.message).snap(
                `0 is not assignable to boolean.`
            )
        })
    })
    describe("true", () => {
        const t = type("true")
        it("type", () => {
            assert(t.infer).typed as true
        })
        it("generation", () => {
            assert(t.create()).is(true)
        })
        it("validation", () => {
            assert(t.validate(true).error).is(undefined)
            assert(t.validate(false).error?.message).snap(
                `false is not assignable to true.`
            )
        })
    })
    describe("false", () => {
        const f = type("false")
        it("type", () => {
            assert(f.infer).typed as false
        })
        it("generation", () => {
            assert(f.create()).is(false)
        })
        it("validation", () => {
            assert(f.validate(false).error).is(undefined)
            assert(f.validate(true).error?.message).snap(
                `true is not assignable to false.`
            )
        })
    })
    describe("bigint", () => {
        const b = type("bigint")
        it("type", () => {
            assert(b.infer).typed as bigint
        })
        it("generation", () => {
            assert(b.create()).is(0n)
        })
        it("validation", () => {
            assert(b.validate(999n).error).is(undefined)
            assert(b.validate(999).error?.message).snap(
                `999 is not assignable to bigint.`
            )
        })
    })
    describe("symbol", () => {
        const s = type("symbol")
        it("type", () => {
            assert(s.infer).typed as symbol
        })
        it("generation", () => {
            assert(typeof s.create()).is("symbol")
        })
        it("validation", () => {
            assert(s.validate(Symbol("")).error).is(undefined)
            assert(s.validate("@").error?.message).snap(
                `"@" is not assignable to symbol.`
            )
        })
    })
    describe("function", () => {
        const f = type("function")
        it("type", () => {
            assert(f.infer).typed as Function
        })
        it("generation", () => {
            assert(typeof f.create()).equals("function")
        })
        it("validation", () => {
            assert(f.validate(() => ({})).error).is(undefined)
            assert(f.validate({}).error?.message).snap(
                `{} is not assignable to function.`
            )
        })
    })
    describe("object", () => {
        const o = type("object")
        it("type", () => {
            assert(o.infer).typed as object
        })
        it("generation", () => {
            assert(o.create()).equals({})
        })
        it("validation", () => {
            assert(o.validate([]).error).is(undefined)
            assert(o.validate({}).error).is(undefined)
            assert(o.validate(null).error?.message).snap(
                `null is not assignable to object.`
            )
        })
    })
    describe("undefined", () => {
        const u = type("undefined")
        it("type", () => {
            assert(u.infer).typed as undefined
        })
        it("generation", () => {
            assert(u.create()).is(undefined)
        })
        it("validation", () => {
            assert(u.validate(undefined).error).is(undefined)
            assert(u.validate(null).error?.message).snap(
                `null is not assignable to undefined.`
            )
        })
    })
    describe("null", () => {
        const n = type("null")
        it("type", () => {
            assert(n.infer).typed as null
        })
        it("generation", () => {
            assert(n.create()).is(null)
        })
        it("validation", () => {
            assert(n.validate(null).error).is(undefined)
            assert(n.validate(undefined).error?.message).snap(
                `undefined is not assignable to null.`
            )
        })
    })
    describe("void", () => {
        const v = type("void")
        it("type", () => {
            assert(v.infer).typed as void
        })
        it("generation", () => {
            assert(v.create()).is(undefined)
        })
        it("validation", () => {
            assert(v.validate(undefined).error).is(undefined)
            assert(v.validate(null).error?.message).snap(
                `null is not assignable to void.`
            )
        })
    })
    describe("any", () => {
        const a = type("any")
        it("type", () => {
            assert(a.infer).typed as any
        })
        it("generation", () => {
            assert(a.create()).is(undefined)
        })
        it("validation", () => {
            assert(a.validate(-34_324n).error).is(undefined)
            assert(a.validate({ yes: "no" }).error).is(undefined)
            assert(a.validate([0, "1", 2, "3"]).error).is(undefined)
        })
    })
    describe("unknown", () => {
        const u = type("unknown")
        it("type", () => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            assert(u.infer).typed as unknown
        })
        it("generation", () => {
            assert(u.create()).is(undefined)
        })
        it("validation", () => {
            assert(u.validate(34_324n).error).is(undefined)
            assert(u.validate({ no: "yes" }).error).is(undefined)
            assert(u.validate(["0", 1, "2", 3]).error).is(undefined)
        })
    })
    describe("never", () => {
        const n = type("never")
        it("type", () => {
            // @ts-ignore
            assert(n.infer).typed as never
        })
        it("generation", () => {
            assert(() => n.create()).throws.snap(
                `Error: Unable to generate a value for 'never': never is ungeneratable by definition.`
            )
        })
        it("validation", () => {
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
            it("type", () => {
                assert(s.infer).typed as string
            })
            it("generation", () => {
                assert(s.create()).is("")
            })
            it("validation", () => {
                assert(s.validate("KEKW").error).is(undefined)
                assert(s.validate(["whoops"]).error?.message).snap(
                    `["whoops"] is not assignable to string.`
                )
            })
        })
        it("email", () => {
            const email = type("email")
            assert(email.infer).typed as string
            assert(email.validate("david@redo.dev").error).is(undefined)
            assert(email.validate("david@redo@dev").error?.message).snap(
                `"david@redo@dev" is not assignable to email.`
            )
        })
        it("alpha", () => {
            const alpha = type("alpha")
            assert(alpha.infer).typed as string
            assert(alpha.validate("aBc").error).is(undefined)
            assert(alpha.validate("a B c").error?.message).snap(
                `"a B c" is not assignable to alpha.`
            )
        })
        it("alphanum", () => {
            const alphaNumeric = type("alphanum")
            assert(alphaNumeric.infer).typed as string
            assert(alphaNumeric.validate("aBc123").error).is(undefined)
            assert(alphaNumeric.validate("aBc+123").error?.message).snap(
                `"aBc+123" is not assignable to alphanum.`
            )
        })
        it("lower", () => {
            const lowercase = type("lower")
            assert(lowercase.infer).typed as string
            assert(lowercase.validate("as long as no uppercase").error).is(
                undefined
            )
            assert(lowercase.validate("whoOps").error?.message).snap(
                `"whoOps" is not assignable to lower.`
            )
        })
        it("upper", () => {
            const uppercase = type("upper")
            assert(uppercase.infer).typed as string
            assert(uppercase.validate("AS LONG AS NO LOWERCASE").error).is(
                undefined
            )
            assert(uppercase.validate("WHOoPS").error?.message).snap(
                `"WHOoPS" is not assignable to upper.`
            )
        })
        // it("char", () => {
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
            it("type", () => {
                assert(n.infer).typed as number
            })
            it("generation", () => {
                assert(n.create()).is(0)
            })
            it("validation", () => {
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
            it("integer", () => {
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

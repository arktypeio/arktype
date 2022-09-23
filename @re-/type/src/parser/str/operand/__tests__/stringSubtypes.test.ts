import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"

describe("string subtypes", () => {
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
        const lowercase = type("lowercase")
        assert(lowercase.infer).typed as string
        assert(lowercase.check("alllowercase").errors).is(undefined)
        assert(lowercase.check("whoOps").errors?.summary).snap(
            `'whoOps' must include only lowercase letters.`
        )
    })
    test("upper", () => {
        const uppercase = type("uppercase")
        assert(uppercase.infer).typed as string
        assert(uppercase.check("ALLUPPERCASE").errors).is(undefined)
        assert(uppercase.check("WHOoPS").errors?.summary).snap(
            `'WHOoPS' must include only uppercase letters.`
        )
    })
})

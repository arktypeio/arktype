import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("regex keywords", () => {
    test("email", () => {
        const email = type("email")
        assert(email.infer).typed as string
        assert(email.check("david@redo.dev").errors).is(undefined)
        assert(email.check("david@redo@dev").errors?.summary).snap(
            `Must be a valid email (was "david@redo@dev")`
        )
    })
    test("alpha", () => {
        const alpha = type("alpha")
        assert(alpha.infer).typed as string
        assert(alpha.check("aBc").errors).is(undefined)
        assert(alpha.check("a B c").errors?.summary).snap(
            `Must include only letters (was "a B c")`
        )
    })
    test("alphanumeric", () => {
        const alphaNumeric = type("alphanumeric")
        assert(alphaNumeric.infer).typed as string
        assert(alphaNumeric.check("aBc123").errors).is(undefined)
        assert(alphaNumeric.check("aBc+123").errors?.summary).snap(
            `Must include only letters and digits (was "aBc+123")`
        )
    })
    test("lowercase", () => {
        const lowercase = type("lowercase")
        assert(lowercase.infer).typed as string
        assert(lowercase.check("alllowercase").errors).is(undefined)
        assert(lowercase.check("whoOps").errors?.summary).snap(
            `Must include only lowercase letters (was "whoOps")`
        )
    })
    test("uppercase", () => {
        const uppercase = type("uppercase")
        assert(uppercase.infer).typed as string
        assert(uppercase.check("ALLUPPERCASE").errors).is(undefined)
        assert(uppercase.check("WHOoPS").errors?.summary).snap(
            `Must include only uppercase letters (was "WHOoPS")`
        )
    })
    test("check non-string", () => {
        const uppercase = type("uppercase")
        assert(uppercase.check(null).errors?.summary).snap(
            "Must be a string (was null)"
        )
    })
})

describe("regex literal", () => {
    test("infer", () => {
        assert(type("/.*/").infer).typed as string
    })
    describe("check", () => {
        test("matching string", () => {
            assert(type("/.*/").check("dursurdo").errors).is(undefined)
        })
        describe("errors", () => {
            test("non-string", () => {
                assert(type("/^[0-9]*$/").check(5).errors?.summary).snap(
                    `Must be a string (was number)`
                )
            })
            test("non-match", () => {
                assert(
                    type("/^[0-9]*$/").check("durrrrrr").errors?.summary
                ).snap(`Must match expression /^[0-9]*$/ (was "durrrrrr")`)
            })
        })
    })
})

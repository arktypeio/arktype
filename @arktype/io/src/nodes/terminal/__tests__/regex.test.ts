import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("regex keywords", () => {
    test("email", () => {
        const email = type("email")
        assert(email.infer).typed as string
        assert(email.check("david@arktype.io").problems).is(undefined)
        assert(email.check("david@arktype@dev").problems?.summary).snap(
            `Must be a valid email (was "david@arktype@dev")`
        )
    })
    test("alphaonly", () => {
        const alphaonly = type("alphaonly")
        assert(alphaonly.infer).typed as string
        assert(alphaonly.check("aBc").problems).is(undefined)
        assert(alphaonly.check("a B c").problems?.summary).snap(
            `Must include only letters (was "a B c")`
        )
    })
    test("alphanumeric", () => {
        const alphaNumeric = type("alphanumeric")
        assert(alphaNumeric.infer).typed as string
        assert(alphaNumeric.check("aBc123").problems).is(undefined)
        assert(alphaNumeric.check("aBc+123").problems?.summary).snap(
            `Must include only letters and digits (was "aBc+123")`
        )
    })
    test("lowercase", () => {
        const lowercase = type("lowercase")
        assert(lowercase.infer).typed as string
        assert(lowercase.check("alllowercase").problems).is(undefined)
        assert(lowercase.check("whoOps").problems?.summary).snap(
            `Must include only lowercase letters (was "whoOps")`
        )
    })
    test("uppercase", () => {
        const uppercase = type("uppercase")
        assert(uppercase.infer).typed as string
        assert(uppercase.check("ALLUPPERCASE").problems).is(undefined)
        assert(uppercase.check("WHOoPS").problems?.summary).snap(
            `Must include only uppercase letters (was "WHOoPS")`
        )
    })
    test("check non-string", () => {
        const uppercase = type("uppercase")
        assert(uppercase.check(null).problems?.summary).snap(
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
            assert(type("/.*/").check("dursurdo").problems).is(undefined)
        })
        describe("errors", () => {
            test("non-string", () => {
                assert(type("/^[0-9]*$/").check(5).problems?.summary).snap(
                    `Must be a string (was number)`
                )
            })
            test("non-match", () => {
                assert(
                    type("/^[0-9]*$/").check("durrrrrr").problems?.summary
                ).snap(`Must match expression /^[0-9]*$/ (was "durrrrrr")`)
            })
        })
    })
})

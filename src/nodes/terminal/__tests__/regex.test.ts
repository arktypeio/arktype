import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("regex keywords", () => {
    test("email", () => {
        const email = type("email")
        attest(email.infer).typed as string
        attest(email.check("david@arktype.io").problems).is(undefined)
        attest(email.check("david@arktype@dev").problems?.summary).snap(
            `Must be a valid email (was "david@arktype@dev")`
        )
    })
    test("alphaonly", () => {
        const alphaonly = type("alphaonly")
        attest(alphaonly.infer).typed as string
        attest(alphaonly.check("aBc").problems).is(undefined)
        attest(alphaonly.check("a B c").problems?.summary).snap(
            `Must include only letters (was "a B c")`
        )
    })
    test("alphanumeric", () => {
        const alphaNumeric = type("alphanumeric")
        attest(alphaNumeric.infer).typed as string
        attest(alphaNumeric.check("aBc123").problems).is(undefined)
        attest(alphaNumeric.check("aBc+123").problems?.summary).snap(
            `Must include only letters and digits (was "aBc+123")`
        )
    })
    test("lowercase", () => {
        const lowercase = type("lowercase")
        attest(lowercase.infer).typed as string
        attest(lowercase.check("alllowercase").problems).is(undefined)
        attest(lowercase.check("whoOps").problems?.summary).snap(
            `Must include only lowercase letters (was "whoOps")`
        )
    })
    test("uppercase", () => {
        const uppercase = type("uppercase")
        attest(uppercase.infer).typed as string
        attest(uppercase.check("ALLUPPERCASE").problems).is(undefined)
        attest(uppercase.check("WHOoPS").problems?.summary).snap(
            `Must include only uppercase letters (was "WHOoPS")`
        )
    })
    test("check non-string", () => {
        const uppercase = type("uppercase")
        attest(uppercase.check(null).problems?.summary).snap(
            "Must be a string (was null)"
        )
    })
})

describe("regex literal", () => {
    test("infer", () => {
        attest(type("/.*/").infer).typed as string
    })
    describe("check", () => {
        test("matching string", () => {
            attest(type("/.*/").check("dursurdo").problems).is(undefined)
        })
        describe("errors", () => {
            test("non-string", () => {
                attest(type("/^[0-9]*$/").check(5).problems?.summary).snap(
                    `Must be a string (was number)`
                )
            })
            test("non-match", () => {
                attest(
                    type("/^[0-9]*$/").check("durrrrrr").problems?.summary
                ).snap(`Must match expression /^[0-9]*$/ (was "durrrrrr")`)
            })
        })
    })
})

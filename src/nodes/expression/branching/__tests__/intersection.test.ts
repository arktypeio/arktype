import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"

describe("intersection node", () => {
    test("infer", () => {
        attest(type("boolean&true").infer).typed as true
        attest(type("number&1&unknown").infer).typed as 1
        attest(type("true&false").infer).typed as never
    })
    describe("check", () => {
        test("two types", () => {
            const numberInteger = type("number&integer")
            attest(numberInteger.check(100).problems).equals(undefined)
            attest(numberInteger.check(99.9).problems?.summary).snap(
                `Must be an integer (was 99.9)`
            )
        })
        test("several types", () => {
            const unknownBooleanFalse = type("unknown&boolean&false")
            attest(unknownBooleanFalse.check(false).problems).equals(undefined)
            attest(unknownBooleanFalse.check("false").problems?.summary)
                .snap(`/: Must be boolean (was string)
/: Must be false (was "false")`)
        })
    })
})

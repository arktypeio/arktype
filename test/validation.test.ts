import { describe, it } from "mocha"
import { ark, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("validation", () => {
    it("parsedDate", () => {
        const parsedDate = type("parsedDate")
        attest(parsedDate("5/21/1993").data?.toDateString()).snap(
            "Fri May 21 1993"
        )
        attest(parsedDate("foo").problems?.summary).snap(
            "Must be a valid date (was 'foo')"
        )
        attest(parsedDate(5).problems?.summary).snap(
            "Must be a string (was number)"
        )
    })

    it("credit card", () => {
        const validCC = "5489582921773376"

        attest(ark.creditCard(validCC).data).equals(validCC)

        // Regex validation
        attest(ark.creditCard("0".repeat(16)).problems?.summary).snap(
            "Must be a valid credit card number (was '0000000000000000')"
        )
        // Luhn validation
        attest(
            ark.creditCard(validCC.slice(0, -1) + "0").problems?.summary
        ).snap("Must be a valid credit card number (was '5489582921773370')")
    })

    it("semver", () => {
        attest(ark.semver("1.0.0").data).equals("1.0.0")
        attest(ark.semver("-1.0.0").problems?.summary).snap(
            "Must be a valid semantic version (see https://semver.org/) (was '-1.0.0')"
        )
    })
})

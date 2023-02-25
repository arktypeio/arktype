import { describe, it } from "mocha"
import { ark, type } from "../../src/main.ts"
import { attest } from "../attest/main.ts"

describe("keywords", () => {
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

        attest(ark.creditCard.node).snap({
            config: { mustBe: "a valid credit card number" },
            node: {
                string: {
                    regex: "^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$",
                    narrow: "(function)"
                }
            }
        })

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

import { describe, it } from "mocha"
import { ark } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

const testCC = "5489582921773376"

describe("parsedDate", () => {
    it("standard validation", () => {
        attest(ark.creditCard(testCC).data).snap("5489582921773376")
        attest(ark.creditCard("0".repeat(16)).problems?.summary).snap(
            "Must be a valid credit card number (was '0000000000000000')"
        )
        attest(ark.creditCard(5).problems?.summary).snap(
            "Must be a valid credit card number (was number)"
        )
    })
    it("luhn validation", () => {
        attest(
            ark.creditCard(testCC.slice(0, -1) + "0").problems?.summary
        ).snap("Must be a valid credit card number (was '5489582921773370')")
    })
})

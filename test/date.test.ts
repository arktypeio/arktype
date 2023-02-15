import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("parsedDate", () => {
    it("defaults", () => {
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
})

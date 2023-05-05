import { type } from "../../src/main.js"
import { dateHelper } from "../../src/utils/date.js"
import { attest } from "../attest/main.js"

describe("test", () => {
    it("tests", () => {
        const t = type(`Date>${dateHelper("10/25/1996")}`)
        const tt = t(new Date("10/24/1996").valueOf())
        attest(tt.problems?.summary).snap(`{"value":846140400000} must be...
• a Date
• more than 846226800000`)

        const ttt = t(new Date("10/26/1996"))
        attest(ttt.data).snap(
            "Sat Oct 26 1996 00:00:00 GMT-0700 (Pacific Daylight Time)"
        )

        const tttt = t(new Date("10/26/1996").valueOf())
        attest(tttt.problems?.summary).snap("Must be a Date (was Number)")
    })
})

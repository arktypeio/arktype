import { type } from "../../src/main.js"
import { getEpochs } from "../../src/utils/date.js"
import { attest } from "../attest/main.js"

describe("Bounded Date", () => {
    it("Date", () => {
        const t = type(`Date>${getEpochs("1/1/2019")}`)
        attest(t(new Date("1/1/2020")).data).snap("Wed Jan 01 2020")

        attest(t(new Date("1/1/2018")).problems?.summary).snap(
            "Must be more than 1546329600000 (was 0)"
        )

        attest(t(new Date("10/24/1996").valueOf()).problems.summary)
            .snap(`{"value":846140400000} must be...
• a Date
• more than 1546329600000`)
    })
    it("equality", () => {
        const t = type(`Date == ${getEpochs("1/1/1")}`)
        attest(t(new Date("1/1/1")).data).snap("Mon Jan 01 2001")

        attest(t(new Date("1/1/2")).problems?.summary).snap(
            "Must be exactly 978336000000 (was 0)"
        )
    })

    it("double bounded", () => {
        const t = type(`${getEpochs("1/1/2018")}<Date<${getEpochs("1/1/2019")}`)

        attest(t(new Date("1/2/2018")).data).snap("Tue Jan 02 2018")
        attest(t(new Date("1/1/2020")).problems?.summary).snap(
            "Must be less than 1546329600000 (was 0)"
        )
    })
})

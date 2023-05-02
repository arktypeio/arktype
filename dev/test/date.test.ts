// import { type } from "../../src/main.js"
// import { attest } from "../attest/main.js"

import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

// const date = (...args: ParametersOf<Date>) => new Date(args).valueOf()

// attest(type(`${date("1/1/2020")}<Date<=${date()}`))
describe("test", () => {
    it("tests", () => {
        const z = type(`Date>${new Date("1/2/2025").valueOf()}`)
        // const t = attest(z(15).problems.summary).snap()
        attest(z)
    })
})

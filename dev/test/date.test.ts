// import { type } from "../../src/main.js"
// import { attest } from "../attest/main.js"

import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

// const date = (...args: ParametersOf<Date>) => new Date(args).valueOf()

// attest(type(`${date("1/1/2020")}<Date<=${date()}`))
describe("test", () => {
    it("tests", () => {
        const z = type(`Date>${Date.now()}`)
        attest(z(new Date("10/25/1996")).data).snap({})
    })
})

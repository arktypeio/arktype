import { type } from "../../src/main.js"
import { throwParseError } from "../../src/utils/errors.js"
import { parametersOf } from "../../src/utils/generics.js"
import { attest } from "../attest/main.js"

const date = (args: parametersOf<typeof Date>) => new Date(args).valueOf()
const d = (input: Date | string | number) => {
    if (input instanceof Date) {
        return input.valueOf()
    }
    try {
        const date = new Date(input).valueOf()
        if (Number.isNaN(date)) {
            throw new Error()
        }
        return date
    } catch {
        throwParseError(
            "input must be a valid Date, well formed date string, or number"
        )
    }
}
type a = parametersOf<typeof Date>
//   ^?
type ab = parametersOf<Date>
//   ^?
describe("test", () => {
    it("tests", () => {
        // const t = type(${d("1/1/2020")}<Date<=${d(Date.now()))
        const t = type(`Date<2`)
        attest(t(d(-2)).problems?.summary).snap("Must be a Date (was Number)")
    })
})

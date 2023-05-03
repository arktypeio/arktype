import { type } from "../../src/main.js"
import { throwParseError } from "../../src/utils/errors.js"
import { parametersOf } from "../../src/utils/generics.js"
import { attest } from "../attest/main.js"

const date = (args: parametersOf<typeof Date>) => new Date(args).valueOf()
// const d = (input: Date | string | number) => {
//     if (input instanceof Date) {
//         return input
//     }
//     try {
//         const date = new Date(input)
//         if (Number.isNaN(date)) {
//             throw new Error()
//         }
//         return date
//     } catch {
//         throwParseError(
//             "input must be a valid Date, well formed date string, or number"
//         )
//     }
// }
const d = (input: Date | string | number) => {
    if (input instanceof Date) {
        return input
    }
    return new Date(input)
}
type a = parametersOf<typeof Date>
//   ^?
type ab = parametersOf<Date>
//   ^?
describe("test", () => {
    it("tests", () => {
        // const t = type(`${d("1/1/2020")}<Date<=${d(Date.now())}`)
        const t = type(`Date<2`)
        const date = d("10/25/1996")
        attest(t(date).problems?.summary).snap("Must be less than 2 (was 0)")
        attest(date.toString()).snap(
            "Fri Oct 25 1996 00:00:00 GMT-0700 (Pacific Daylight Saving Time)"
        )
        // const t = type("Date<2")
        // const tt = t(new Date("1/1/1955"))
        // attest(tt.data.toString()).snap(
        //     "Sat Jan 01 1955 00:00:00 GMT-0800 (Pacific Standard Time)"
        // )
        // attest(t(d(-2)).problems?.summary).snap("a")
    })
})

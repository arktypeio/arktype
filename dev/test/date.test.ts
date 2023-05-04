import { type } from "../../src/main.js"
import type { parametersOf } from "../../src/utils/generics.js"
import { attest } from "../attest/main.js"

// const date = (args: parametersOf<typeof Date>) => new Date(args).valueOf()
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
        const t = type(`Date>2`)
        const date = d("10/25/1996")
        attest(t(date).data).snap({})
        attest(t(date.toString()).data).snap()
        attest(date.toString()).snap(
            "Fri Oct 25 1996 00:00:00 GMT-0700 (Pacific Daylight Time)"
        )
    })
})

import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeInvalidDateMessage } from "../../src/parse/string/shift/operand/date.js"
import { attest } from "../attest/main.js"

suite("Date Literal", () => {
    suite("literal", () => {
        test("literal", () => {
            const t = type("d'2000/05/05'")
            attest(t.infer).typed as Date
            attest(t.allows(new Date("2000/05/05"))).equals(true)
            attest(t.allows(new Date("2000/06/05"))).equals(false)
            attest(t.allows(new Date("2000/05/05T09:00:00.00Z"))).equals(false)
        })
        test("ISO", () => {
            const ISO = type("d'2000-05-05T04:00:00.000Z'")
            attest(ISO.infer).typed as Date
            attest(ISO.allows(new Date("2000/05/05"))).equals(true)
            attest(ISO.allows(new Date("2000/07/05"))).equals(false)
        })
        test("allows spaces", () => {
            const t = type("d' 2021/05/01  '")
            attest(t.allows(new Date("2021/05/01"))).equals(true)
        })
        suite("errors", () => {
            test("epoch", () => {
                attest(() => type("d'12345671234'")).throws(
                    writeInvalidDateMessage("12345671234")
                )
            })
            test("not a date", () => {
                attest(() => type("d'tuesday'")).throws(
                    writeInvalidDateMessage("tuesday")
                )
            })
        })
    })
})

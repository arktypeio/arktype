import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("dates", () => {
    test("date", () => {
        const d = type("Date>=d'1990.1.1'")
        attest(d(new Date("1990.1.1")).data).snap("Mon Jan 01 1990")
        attest(d(new Date()).data).snap()
    })
})
suite("Errors", () => {
    test("date", () => {
        const d = type("d'1987/1/1'<Date<d'1990.1.1'")
        attest(d(new Date("1990.1.1")).data).snap("Mon Jan 01 1990")
    })
    //idea for date.now?
    // test("empty", () => {
    //     const d = type("d''")
    //     attest(d(new Date("1991.1.1")).problems?.summary).snap(
    //         'Must be "Fri Jun 16 2023" (was "Tue Jan 01 1991")'
    //     )
    // })
    test("non-date", () => {
        attest(() => type("d'not a date'")).throws.snap(
            "Error: Date string was not able to be parsed."
        )
    })
    //This should not be ok anymore I guess todoshawn
    test("Date Bounded by number literal", () => {
        const d = type("Date > 2")
        attest(d(new Date()).data).snap()
    })
    test("Date must be enclosed", () => {
        //@ts-expect-error
        attest(() => type('d"abcd')).throws.snap(
            'Error: "abcd requires a closing double-quote'
        )
    })
})

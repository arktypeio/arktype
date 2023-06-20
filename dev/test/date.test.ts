import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("Valid Date Formats", () => {
    test("literal yyyy/mm/dd", () => {
        const ddd = type("d'2000/1/1'")
        const dddd = ddd(new Date("2000/1/1"))
        attest(dddd.data).snap()
    })
    suite("Single Bounded Date", () => {
        test(">=", () => {
            const d = type("Date>=d'1111.1.1'")
            attest(d(new Date("1111.1.1")).data).snap("Sun Jan 01 1111")
            attest(d(new Date("1111.1.2")).data).snap("Mon Jan 02 1111")
            attest(d(new Date("1110.1.1")).problems?.summary).snap(
                "Must be at least Sun Jan 01 1111 (was Sat Jan 01 1110)"
            )
        })
        test(">", () => {
            const d = type("Date>d'1111.1.1'")
            attest(d(new Date("1112.1.1")).data).snap("Mon Jan 01 1112")
            attest(d(new Date("1110.1.1")).problems?.summary).snap(
                "Must be more than Sun Jan 01 1111 (was Sat Jan 01 1110)"
            )
            attest(d(new Date("1111.1.1")).problems?.summary).snap(
                "Must be more than Sun Jan 01 1111 (was Sun Jan 01 1111)"
            )
        })
        test("<", () => {
            const d = type("Date<d'1111.1.1'")
            attest(d(new Date("1110.1.1")).data).snap("Sat Jan 01 1110")
            attest(d(new Date("1112.1.1")).problems?.summary).snap(
                "Must be less than Sun Jan 01 1111 (was Mon Jan 01 1112)"
            )
            attest(d(new Date("1111.1.1")).problems?.summary).snap(
                "Must be less than Sun Jan 01 1111 (was Sun Jan 01 1111)"
            )
        })
    })
    test("Double Bounded Date", () => {
        const d = type('d"2001/2/1"<Date<d"2001/2/7"')
        attest(d(new Date("2001/2/3")).data).snap("Sat Feb 03 2001")
        attest(d(new Date("2001/2/7")).problems?.summary).snap(
            "Must be less than Wed Feb 07 2001 (was Wed Feb 07 2001)"
        )
    })

    test("parse", () => {
        const t0 = type("d'01/1/1'")
        const t1 = type("d'01.1.1'")
        attest(t0.infer).typed as Date
        attest(t0.root.condition).equals(t1.root.condition)
    })
    // Acts as new Date()
    // test("empty", () => {
    //     const d = type("d''")
    //     attest(d(new Date()))
    // })
})
suite("Errors", () => {
    test("non-date", () => {
        attest(() => type("d'not a date'")).throws.equals(
            "Error: new Date(not a date) resulted in an Invalid Date. (Suggested format: YYYY/MM/DD)"
        )
    })
    test("Improper Bound", () => {
        //@ts-expect-error
        attest(() => type("Date>5")).throws.equals(
            "Error: Comparator > must be followed by a number literal (was 'number')"
        )
    })
    test("Date must be enclosed", () => {
        //@ts-expect-error
        attest(() => type('d"abcd')).throws.equals(
            'Error: d"abcd requires a closing double-quote'
        )
    })
})

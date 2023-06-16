import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeUnboundableMessage } from "../../src/parse/ast/bound.js"
import { writeUnterminatedEnclosedMessage } from "../../src/parse/string/shift/operand/enclosed.js"
import { attest } from "../attest/main.js"

test("date12", () => {
    // const today = new Date()
    // attest(today).snap("Wed Jun 14 2023")
    // const birthday2 = new Date() // This is standardized and will work reliably
    // attest(birthday2).snap("Sun Dec 17 1995")
    // const birthday3 = new Date(1995, 11, 17) // the month is 0-indexed
    // attest(birthday3).snap("Sun Dec 17 1995")
    // const birthday4 = new Date(1995, 11, 17, 3, 24, 0)
    // attest(birthday4).snap("Sun Dec 17 1995")
    // const birthday5 = new Date(628021800000) // passing epoch timestamp
    // attest(birthday5).snap("Sat Nov 25 1989")

    //This is interesting, since this is inferred as Date, it's correct right now
    // Do I need to add a check to ensure that the thing that's being bounded doesn't extend date literal, or would this actually be correct
    //todoshawn DAVID HELP const ddd = type("d'10/25/1996' > 2")
    const ddd = type("d'1996-10-25'")

    attest(ddd(new Date("1996-10-25").toISOString()).data).snap(
        "1996-10-25T00:00:00.000Z"
    )
    // //is this valid?
    // const dddd = type("d'10/25/1996' > 2")
    // const ddddd = type("Date > d'10-25-1996'")
})
suite("Errors", () => {
    test("non-Date format", () => {
        const d = type("Date>=d'1111.1.1'")
        attest(d(new Date("1111.1.1")).problems?.summary).snap(
            "Must be at least Invalid Date (was Sun Jan 01 1111)"
        )
    })
    test("empty", () => {
        const d = type("d''")
    })
    test("non-date", () => {
        const d = type("d'not a date'")
        attest(() => d).throws.snap()
    })
    //This should not be ok anymore I guess todoshawn
    test("Date Bounded by number literal", () => {
        const d = type("Date > 2")
    })
    test("Date bounded by nonsense", () => {
        //@ts-expect-error
        const d = type("Date>number")
        attest(() => d).throwsAndHasTypeError(writeUnboundableMessage("number"))
    })
    test("Date must be enclosed", () => {
        //@ts-expect-error
        const d = type('d"abcd')
        attest(() => d).throwsAndHasTypeError(
            writeUnterminatedEnclosedMessage('d"abcd', '"')
        )
    })
})

import { suite, test } from "mocha"
import { node, type } from "../../src/main.js"
import type { Range } from "../../src/nodes/primitive/range.js"
import { writeInvalidDateMessage } from "../../src/parse/string/shift/operand/date.js"
import { writeInvalidLimitMessage } from "../../src/parse/string/shift/operator/bounds.js"
import { attest } from "../attest/main.js"

export const expectedDateBoundsCondition = (...range: Range) =>
    node({ basis: Date, range }).condition

suite("Date", () => {
    suite("literal", () => {
        test("literal", () => {
            const t = type("d'2000/05/05'")
            attest(t.infer).typed as Date
            attest(t.allows(new Date("2000/05/05"))).equals(true)
            attest(t.allows(new Date("2000/06/05"))).equals(false)
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

    suite("date literal range", () => {
        suite("single", () => {
            test(">", () => {
                const t = type("Date>d'2001/5/5'")
                attest(t.infer).typed as Date
            })
            test("<", () => {
                const t = type("Date<d'2023/1/12'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition({
                        comparator: "<",
                        limit: new Date("2023/1/12")
                    })
                )
            })
            test("<=", () => {
                const t = type("Date<=d'2021/1/12'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition({
                        comparator: "<=",
                        limit: new Date("2021/1/12")
                    })
                )
                attest(t.allows(new Date("2021/1/1"))).equals(true)
            })
            test("==", () => {
                const t = type("Date==d'2020-1-1'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition({
                        comparator: "==",
                        limit: new Date("2020-1-1")
                    })
                )
                attest(t.allows(new Date("2020/01/01"))).equals(true)
                attest(t.allows(new Date("2020/01/02"))).equals(false)
            })
        })
        suite("double", () => {
            test("<,<", () => {
                const t = type("d'2001/10/10'<Date<d'2005/10/10'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition(
                        {
                            comparator: ">",
                            limit: new Date("2001/10/10")
                        },
                        {
                            comparator: "<",
                            limit: new Date("2005/10/10")
                        }
                    )
                )
                attest(t.allows(new Date("2003/10/10"))).equals(true)
                attest(t.allows(new Date("2001/10/10"))).equals(false)
                attest(t.allows(new Date("2005/10/10"))).equals(false)
            })
            test("<=,<", () => {
                const t = type("d'1990/10/10'<=Date<d'2006/10/10'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition(
                        {
                            comparator: ">=",
                            limit: new Date("1990/10/10")
                        },
                        {
                            comparator: "<",
                            limit: new Date("2006/10/10")
                        }
                    )
                )
                attest(t.allows(new Date("1990/10/10"))).equals(true)
            })
            test("<,<=", () => {
                const t = type("d'2020/1/1'<Date<=d'2024/1/1'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition(
                        {
                            comparator: ">",
                            limit: new Date("2020/1/1")
                        },
                        {
                            comparator: "<=",
                            limit: new Date("2024/1/1")
                        }
                    )
                )
                attest(t.allows(new Date("2024/1/1"))).equals(true)
            })
        })
        suite("errors", () => {
            test("invalid bound type", () => {
                // @ts-expect-error
                attest(() => type("Date<2")).throwsAndHasTypeError(
                    writeInvalidLimitMessage("<", "2", "right")
                )
            })
            test("invalid literal bound", () => {
                attest(() => type("Date<d'12342521321'")).throws(
                    writeInvalidDateMessage("12342521321")
                )
            })
        })
        suite("intersections", () => {
            suite("equality range", () => {
                test("equal", () => {
                    attest(
                        type("Date==d'2000/1/1'&Date==d'2000/1/1'").condition
                    ).equals(type("Date==d'2000/1/1'").condition)
                })
                test("disjoint", () => {
                    attest(() =>
                        type("Date==d'2000/2/2'&Date==d'3000/1/1'")
                    ).throws(
                        "Intersection of the day Wed Feb 02 2000 and the day Wed Jan 01 3000 results in an unsatisfiable type"
                    )
                })
                test("right equality range", () => {
                    attest(
                        type("Date<d'2004/1/1'&Date==d'2002/1/1'").condition
                    ).equals(type("Date==d'2002/1/1'").condition)
                })
                test("Date and Number", () => {
                    attest(() => type("Date>d'1990-01-01'&number>2")).throws(
                        "Intersection of a Date and a number results in an unsatisfiable type"
                    )
                })
                test("left equality range", () => {
                    attest(
                        type("Date==d'2000.1.1'&Date>=d'2000.1.1'").condition
                    ).equals(type("Date==d'2000-1-1'").condition)
                })
            })
            test("overlapping", () => {
                const expected = type(
                    "d'2000/10/10'<=Date<d'3000/10/10'"
                ).condition
                attest(
                    type("Date>=d'2000/10/10'&Date<d'3000/10/10'").condition
                ).equals(expected)
                attest(
                    type(
                        "d'2000/10/10'<=Date<d'4000/10/10'&d'1000/10/10'<=Date<d'3000/10/10'"
                    ).condition
                ).equals(expected)
            })
            test("single value overlap", () => {
                attest(
                    type("d'1900/1/1'<=Date<=d'1900/01/01'").condition
                ).equals(type("Date==d'1900/01/01'").condition)
            })
            test("non-overlapping", () => {
                attest(
                    () =>
                        type("Date>d'2000/01/01'&Date<=d'2000/01/01'").condition
                ).throws.snap(
                    "Error: Intersection of after Sat Jan 01 2000 and at or before Sat Jan 01 2000 results in an unsatisfiable type"
                )
                attest(() =>
                    type(
                        "d'1990/01/01'<Date<d'1992/02/02'&d'1993/01/01'<Date<d'2000/01/01'"
                    )
                ).throws.snap(
                    "Error: Intersection of the range bounded by after Mon Jan 01 1990 and before Sun Feb 02 1992 and the range bounded by after Fri Jan 01 1993 and before Sat Jan 01 2000 results in an unsatisfiable type"
                )
            })
            test("greater min is stricter", () => {
                const expected = type("Date>=d'1990/1/1'").condition
                attest(
                    type("Date>=d'1990/1/1'&Date>d'1980/02/02'").condition
                ).equals(expected)
                attest(
                    type("Date>d'1980/02/02'&Date>=d'1990/1/1'").condition
                ).equals(expected)
            })
            test("lesser max is stricter", () => {
                const expected = type("Date<=d'1990/1/1'").condition
                attest(
                    type("Date<=d'1990/1/1'&Date<d'2006/06/04'").condition
                ).equals(expected)
                attest(
                    type("Date<d'2006/06/04'&Date<=d'1990/1/1'").condition
                ).equals(expected)
            })
            test("exclusive wins if limits equal", () => {
                const expected = type("Date<d'2000/05/05'").condition
                attest(
                    type("Date<d'2000/05/05'&Date<=d'2000/05/05'").condition
                ).equals(expected)
                attest(
                    type("Date<=d'2000/05/05'&Date<d'2000/05/05'").condition
                ).equals(expected)
            })
        })
    })
})

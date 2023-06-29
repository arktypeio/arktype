import { suite, test } from "mocha"
import { node, type } from "../../src/main.js"
import type { Range } from "../../src/nodes/primitive/range.js"
import { writeInvalidDateMessage } from "../../src/parse/string/shift/operand/date.js"
import { writeInvalidLimitMessage } from "../../src/parse/string/shift/operator/bounds.js"
import { attest } from "../attest/main.js"

export const expectedDateBoundsCondition = (...range: Range) =>
    node({ basis: Date, range }).condition

suite("Date", () => {
    test("literal", () => {
        const t = type("d'2000/05/05'")
        const ISO = type("d'2000-05-05T04:00:00.000Z'")
        const dateString = type("d'Fri May 05 2000'")
        attest(t.infer).typed as Date
        attest(ISO.infer).typed as Date
        attest(dateString.infer).typed as Date
        attest(t.condition).equals(ISO.condition)
        attest(t.condition).equals(dateString.condition)
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
                        limit: "d'2023/1/12'"
                    })
                )
            })
            test("<=", () => {
                const t = type("Date<=d'2021/1/12'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition({
                        comparator: "<=",
                        limit: "d'2021/1/12'"
                    })
                )
            })
            test("==", () => {
                const t = type("Date==d'2020-1-1'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition({
                        comparator: "==",
                        limit: "d'2020-1-1'"
                    })
                )
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
                            limit: "d'2001/10/10'"
                        },
                        {
                            comparator: "<",
                            limit: "d'2005/10/10'"
                        }
                    )
                )
            })
            test("<=,<", () => {
                const t = type("d'1800/10/10'<=Date<d'1886/10/10'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition(
                        {
                            comparator: ">=",
                            limit: "d'1800/10/10'"
                        },
                        {
                            comparator: "<",
                            limit: "d'1886/10/10'"
                        }
                    )
                )
            })
            test("<,<=", () => {
                const t = type("d'2020/1/1'<Date<=d'2024/1/1'")
                attest(t.infer).typed as Date
                attest(t.condition).equals(
                    expectedDateBoundsCondition(
                        {
                            comparator: ">",
                            limit: "d'2020/1/1'"
                        },
                        {
                            comparator: "<=",
                            limit: "d'2024/1/1'"
                        }
                    )
                )
            })
        })
        suite("errors", () => {
            test("epoch", () => {
                attest(() => type("d'12345671234'")).throws(
                    writeInvalidDateMessage("12345671234")
                )
            })
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
                        "Error: Intersection of ==d'2000/2/2' and ==d'3000/1/1' results in an unsatisfiable type"
                    )
                })
                test("right equality range", () => {
                    attest(
                        type("Date<d'2004/1/1'&Date==d'2002/1/1'").condition
                    ).equals(type("Date==d'2002/1/1'").condition)
                })
                test("Date and Number", () => {
                    attest(() => type("Date>d'1990-01-01'&number>2")).throws(
                        "Intersection of Date and number results in an unsatisfiable type"
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
                ).throws(
                    "Intersection of >d'2000/01/01' and <=d'2000/01/01' results in an unsatisfiable type"
                )
                attest(() =>
                    type(
                        "d'1990/01/01'<Date<d'1992/02/02'&d'1993/01/01'<Date<d'2000/01/01'"
                    )
                ).throws(
                    "Intersection of the range bounded by >d'1990/01/01' and <d'1992/02/02' and the range bounded by >d'1993/01/01' and <d'2000/01/01' results in an unsatisfiable type"
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

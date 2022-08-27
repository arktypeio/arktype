import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("parenthesized", () => {
    test("entire expression", () => {
        assert(type("(string)").infer).typed as string
    })
    test("default precedence", () => {
        const unionWithList = type("boolean|number[]")
        assert(unionWithList.infer).typed as boolean | number[]
        assert(unionWithList.check(true).error).equals(undefined)
        assert(unionWithList.check([1, 2, 3]).error).equals(undefined)
        assert(unionWithList.check([true, false]).error?.message).snap(
            `[true, false] is not assignable to any of boolean|number[].`
        )
    })
    test("grouped precedence", () => {
        const listOfUnion = type("(boolean|number)[]")
        assert(listOfUnion.infer).typed as (boolean | number)[]
        assert(listOfUnion.check([]).error).equals(undefined)
        assert(listOfUnion.check([1]).error).equals(undefined)
        assert(listOfUnion.check([1, true]).error).equals(undefined)
        assert(listOfUnion.check(true).error?.message).snap(
            `true is not assignable to boolean|number[].`
        )
        assert(listOfUnion.check(1).error?.message).snap(
            `1 is not assignable to boolean|number[].`
        )
        assert(listOfUnion.check(["foo"]).error?.message).snap(
            `At index 0, "foo" is not assignable to any of boolean|number.`
        )
    })
    test("nested precedence", () => {
        const listOfUnionOfListsOfUnions = type(
            "((boolean|number)[]|(string|undefined)[])[]"
        )
        assert(listOfUnionOfListsOfUnions.tree).typedValue([
            [
                [["boolean", "|", "number"], "[]"],
                "|",
                [["string", "|", "undefined"], "[]"]
            ],
            "[]"
        ])
        assert(listOfUnionOfListsOfUnions.infer).typed as (
            | (boolean | number)[]
            | (string | undefined)[]
        )[]
        assert(listOfUnionOfListsOfUnions.check([]).error).equals(undefined)
        assert(listOfUnionOfListsOfUnions.check([[1, true]]).error).equals(
            undefined
        )
        assert(
            listOfUnionOfListsOfUnions.check([[1], ["foo", undefined], [true]])
                .error
        ).equals(undefined)
        // TODO: Add precedence as a prop to determine when to parenthesize
        assert(
            listOfUnionOfListsOfUnions.check([undefined]).error?.message
        ).snap(
            `At index 0, undefined is not assignable to any of boolean|number[]|string|undefined[].`
        )
        // Can't mix items from each list
        assert(
            listOfUnionOfListsOfUnions.check([[false, "foo"]]).error?.message
        ).snap(
            `At index 0, [false, "foo"] is not assignable to any of boolean|number[]|string|undefined[].`
        )
    })
    describe("errors", () => {
        test("empty", () => {
            assert(() => {
                // @ts-expect-error
                type("()").infer
            }).type.errors.snap(
                `Argument of type '"()"' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        test("unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("string|(boolean|number[]").infer
            }).type.errors.snap(
                `Argument of type '"string|(boolean|number[]"' is not assignable to parameter of type '"Missing )."'.`
            )
        })
        test("unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("string|number[]|boolean)").infer
            }).type.errors.snap(
                `Argument of type '"string|number[]|boolean)"' is not assignable to parameter of type '"Unexpected )."'.`
            )
        })
        test("lone )", () => {
            assert(() => {
                // @ts-expect-error
                type(")").infer
            }).type.errors.snap(
                `Argument of type '")"' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        test("lone (", () => {
            assert(() => {
                // @ts-expect-error
                type("(").infer
            }).type.errors.snap(
                `Argument of type '"("' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        test("deep unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2").infer
            }).type.errors.snap(
                `Argument of type '"(null|(undefined|(1))|2"' is not assignable to parameter of type '"Missing )."'.`
            )
        })
        test("deep unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))").infer
            }).type.errors.snap(
                `Argument of type '"((string|number)[]|boolean))"' is not assignable to parameter of type '"Unexpected )."'.`
            )
        })
        test("starting )", () => {
            assert(() => {
                // @ts-expect-error
                type(")number(")
            }).type.errors.snap(
                `Argument of type '")number("' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        test("misplaced )", () => {
            assert(() => {
                // @ts-expect-error
                type("(number|)")
            }).type.errors.snap(
                `Argument of type '"(number|)"' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
    })
})

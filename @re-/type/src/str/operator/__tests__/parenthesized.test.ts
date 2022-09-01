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
        assert(unionWithList.check(true).errors).equals(undefined)
        assert(unionWithList.check([1, 2, 3]).errors).equals(undefined)
        assert(unionWithList.check([true, false]).errors?.summary).snap(
            `[true, false] is not assignable to any of boolean|number[].`
        )
    })
    test("grouped precedence", () => {
        const listOfUnion = type("(boolean|number)[]")
        assert(listOfUnion.infer).typed as (boolean | number)[]
        assert(listOfUnion.check([]).errors).equals(undefined)
        assert(listOfUnion.check([1]).errors).equals(undefined)
        assert(listOfUnion.check([1, true]).errors).equals(undefined)
        assert(listOfUnion.check(true).errors?.summary).snap(
            `true is not assignable to boolean|number[].`
        )
        assert(listOfUnion.check(1).errors?.summary).snap(
            `1 is not assignable to boolean|number[].`
        )
        assert(listOfUnion.check(["foo"]).errors?.summary).snap(
            `At path 0, "foo" is not assignable to any of boolean|number.`
        )
    })
    test("nested precedence", () => {
        const listOfUnionOfListsOfUnions = type(
            "((boolean|number)[]|(string|undefined)[])[]"
        )
        assert(listOfUnionOfListsOfUnions.tree).narrowedValue([
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
        assert(listOfUnionOfListsOfUnions.check([]).errors).equals(undefined)
        assert(listOfUnionOfListsOfUnions.check([[1, true]]).errors).equals(
            undefined
        )
        assert(
            listOfUnionOfListsOfUnions.check([[1], ["foo", undefined], [true]])
                .errors
        ).equals(undefined)
        // TODO: Add precedence as a prop to determine when to parenthesize
        assert(
            listOfUnionOfListsOfUnions.check([undefined]).errors?.summary
        ).snap(
            `At path 0, undefined is not assignable to any of boolean|number[]|string|undefined[].`
        )
        // Can't mix items from each list
        assert(
            listOfUnionOfListsOfUnions.check([[false, "foo"]]).errors?.summary
        ).snap(
            `At path 0, [false, "foo"] is not assignable to any of boolean|number[]|string|undefined[].`
        )
    })
    describe("errors", () => {
        test("empty", () => {
            assert(() => {
                // @ts-expect-error
                type("()").infer
            }).throwsAndHasTypeError("Expected an expression (got ')').")
        })
        test("unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("string|(boolean|number[]").infer
            }).throwsAndHasTypeError("Missing ).")
        })
        test("unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("string|number[]|boolean)").infer
            }).throwsAndHasTypeError("Unexpected ).")
        })
        test("lone )", () => {
            assert(() => {
                // @ts-expect-error
                type(")").infer
            }).throwsAndHasTypeError("Expected an expression (got ')').")
        })
        test("lone (", () => {
            assert(() => {
                // @ts-expect-error
                type("(").infer
            }).throwsAndHasTypeError("Expected an expression.")
        })
        test("deep unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2").infer
            }).throwsAndHasTypeError("Missing ).")
        })
        test("deep unmatched )", () => {
            // TODO: Add context to errors like this to show where it is
            assert(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))").infer
            }).throwsAndHasTypeError("Unexpected ).")
        })
        test("starting )", () => {
            assert(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError("Expected an expression (got ')number(').")
        })
        test("misplaced )", () => {
            assert(() => {
                // @ts-expect-error
                type("(number|)")
            }).throwsAndHasTypeError("Expected an expression (got ')').")
        })
    })
})

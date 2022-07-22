import { assert } from "@re-/assert"
import { type } from "../../src/type.js"

describe("parenthesized", () => {
    it("entire expression", () => {
        assert(type("(string)").infer).typed as string
    })
    it("default precedence", () => {
        const unionWithList = type("boolean|number[]")
        assert(unionWithList.infer).typed as boolean | number[]
        assert(unionWithList.validate(true).error).equals(undefined)
        assert(unionWithList.validate([1, 2, 3]).error).equals(undefined)
        assert(unionWithList.validate([true, false]).error?.message).snap(
            `[true, false] is not assignable to any of boolean|number[].`
        )
    })
    it("grouped precedence", () => {
        const listOfUnion = type("(boolean|number)[]")
        assert(listOfUnion.infer).typed as (boolean | number)[]
        assert(listOfUnion.validate([]).error).equals(undefined)
        assert(listOfUnion.validate([1]).error).equals(undefined)
        assert(listOfUnion.validate([1, true]).error).equals(undefined)
        assert(listOfUnion.validate(true).error?.message).snap()
        assert(listOfUnion.validate(1).error?.message).snap()
        assert(listOfUnion.validate(["foo"]).error?.message).snap()
    })
    it("nested precedence", () => {
        const listOfUnionOfListsOfUnions = type(
            "((boolean|number)[]|(string|undefined)[])[]"
        )
        assert(listOfUnionOfListsOfUnions.infer).typed as (
            | (boolean | number)[]
            | (string | undefined)[]
        )[]
        assert(listOfUnionOfListsOfUnions.validate([]).error).equals(undefined)
        assert(listOfUnionOfListsOfUnions.validate([[1, true]]).error).equals(
            undefined
        )
        assert(
            listOfUnionOfListsOfUnions.validate([
                [1],
                ["foo", undefined],
                [true]
            ]).error
        ).equals(undefined)
        assert(
            listOfUnionOfListsOfUnions.validate([undefined]).error?.message
        ).snap()
        // Can't mix items from each list
        assert(
            listOfUnionOfListsOfUnions.validate([[false, "foo"]]).error?.message
        ).snap()
    })
    describe("errors", () => {
        it("empty", () => {
            assert(() => {
                // @ts-expect-error
                type("()").infer
            }).type.errors.snap(
                `Argument of type '"()"' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        it("unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("string|(boolean|number[]").infer
            }).type.errors.snap(
                `Argument of type '"string|(boolean|number[]"' is not assignable to parameter of type '"Missing )."'.`
            )
        })
        it("unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("string|number[]|boolean)").infer
            }).type.errors.snap(
                `Argument of type '"string|number[]|boolean)"' is not assignable to parameter of type '"Unexpected )."'.`
            )
        })
        it("lone )", () => {
            assert(() => {
                // @ts-expect-error
                type(")").infer
            }).type.errors.snap(
                `Argument of type '")"' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        it("lone (", () => {
            assert(() => {
                // @ts-expect-error
                type("(").infer
            }).type.errors.snap(
                `Argument of type '"("' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        it("deep unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2").infer
            }).type.errors.snap(
                `Argument of type '"(null|(undefined|(1))|2"' is not assignable to parameter of type '"Missing )."'.`
            )
        })
        it("deep unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))").infer
            }).type.errors.snap(
                `Argument of type '"((string|number)[]|boolean))"' is not assignable to parameter of type '"Unexpected )."'.`
            )
        })
        it("starting )", () => {
            assert(() => {
                // @ts-expect-error
                type(")number(")
            }).type.errors.snap(
                `Argument of type '")number("' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
        it("misplaced )", () => {
            assert(() => {
                // @ts-expect-error
                type("(number|)")
            }).type.errors.snap(
                `Argument of type '"(number|)"' is not assignable to parameter of type '"Expected an expression."'.`
            )
        })
    })
})

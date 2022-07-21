import { assert } from "@re-/assert"
import { model } from "../../src/model.js"

// TODO: Add error tests
describe("parenthesized", () => {
    it("entire expression", () => {
        assert(model("(string)").type).typed as string
    })
    it("default precedence", () => {
        const unionWithList = model("boolean|number[]")
        assert(unionWithList.type).typed as boolean | number[]
        assert(unionWithList.validate(true).error).equals(undefined)
        assert(unionWithList.validate([1, 2, 3]).error).equals(undefined)
        assert(unionWithList.validate([true, false]).error?.message).snap(
            `[true, false] is not assignable to any of boolean|number[].`
        )
    })
    it("grouped precedence", () => {
        const listOfUnion = model("(boolean|number)[]")
        assert(listOfUnion.type).typed as (boolean | number)[]
        assert(listOfUnion.validate([]).error).equals(undefined)
        assert(listOfUnion.validate([1]).error).equals(undefined)
        assert(listOfUnion.validate([1, true]).error).equals(undefined)
        assert(listOfUnion.validate(true).error?.message).snap()
        assert(listOfUnion.validate(1).error?.message).snap()
        assert(listOfUnion.validate(["foo"]).error?.message).snap()
    })
    it("nested precedence", () => {
        const listOfUnionOfListsOfUnions = model(
            "((boolean|number)[]|(string|undefined)[])[]"
        )
        assert(listOfUnionOfListsOfUnions.type).typed as (
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
    // describe("errors", () => {
    //     it("empty", () => {
    //         assert(() => {
    //             model("()").type
    //         }).type.errors.snap()
    //     })
    //     it("unmatched (", () => {
    //         assert(() => {
    //             model("()").type
    //         }).type.errors.snap()
    //     })
    //     it("unmatched )", () => {
    //         assert(() => {
    //             model("()").type
    //         }).type.errors.snap()
    //     })
    //     it("deep unmatched (", () => {
    //         assert(() => {
    //             model("(null|undefined|1|(").type
    //         }).type.errors.snap()
    //     })
    //     it("deep unmatched )", () => {
    //         assert(() => {
    //             // @ts-expect-error
    //             model("((string|number)[]|boolean))").type
    //         }).type.errors.snap()
    //     })
    //     it("starting )", () => {
    //         assert(() => {
    //             // @ts-expect-error
    //             model(")number(")
    //         }).type.errors.snap()
    //     })
    //     it("misplaced )", () => {
    //         assert(() => {
    //             // @ts-expect-error
    //             model("(number|)")
    //         }).type.errors.snap()
    //     })
    // })
})

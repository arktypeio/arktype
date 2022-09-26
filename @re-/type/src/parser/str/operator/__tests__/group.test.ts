import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../scopes/type.js"
import { unclosedGroupMessage } from "../../full.js"
import { expressionExpectedMessage } from "../../operand/common.js"
import { unexpectedGroupCloseMessage } from "../groupClose.js"

describe("group", () => {
    test("entire expression", () => {
        assert(type("(string)").ast).narrowedValue("string")
    })
    test("overrides default precedence", () => {
        assert(type("boolean|number[]").ast).narrowedValue([
            "boolean",
            "|",
            ["number", "[]"]
        ])
        assert(type("(boolean|number)[]").ast).narrowedValue([
            ["boolean", "|", "number"],
            "[]"
        ])
    })
    test("nested", () => {
        assert(
            type("((boolean|number)[]|(string|undefined)[])[]").ast
        ).narrowedValue([
            [
                [["boolean", "|", "number"], "[]"],
                "|",
                [["string", "|", "undefined"], "[]"]
            ],
            "[]"
        ])
    })
    describe("errors", () => {
        test("empty", () => {
            assert(() => {
                // @ts-expect-error
                type("()")
            }).throwsAndHasTypeError(expressionExpectedMessage(")"))
        })
        test("unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("string|(boolean|number[]")
            }).throwsAndHasTypeError(unclosedGroupMessage)
        })
        test("unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("string|number[]|boolean)")
            }).throwsAndHasTypeError(unexpectedGroupCloseMessage(""))
        })
        test("lone )", () => {
            assert(() => {
                // @ts-expect-error
                type(")")
            }).throwsAndHasTypeError(expressionExpectedMessage(")"))
        })
        test("lone (", () => {
            assert(() => {
                // @ts-expect-error
                type("(")
            }).throwsAndHasTypeError(expressionExpectedMessage(""))
        })
        test("deep unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2")
            }).throwsAndHasTypeError(unclosedGroupMessage)
        })
        test("deep unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))[]")
            }).throwsAndHasTypeError(unexpectedGroupCloseMessage("[]"))
        })
        test("starting )", () => {
            assert(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError(expressionExpectedMessage(")number("))
        })
        test("misplaced )", () => {
            assert(() => {
                // @ts-expect-error
                type("(number|)")
            }).throwsAndHasTypeError(expressionExpectedMessage(")"))
        })
    })
})

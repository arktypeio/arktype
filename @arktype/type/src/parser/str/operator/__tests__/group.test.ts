import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { GroupOpen } from "../../operand/groupOpen.js"
import { Operand } from "../../operand/operand.js"
import { GroupClose } from "../groupClose.js"

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
            }).throwsAndHasTypeError(
                Operand.buildExpressionExpectedMessage(")")
            )
        })
        test("unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("string|(boolean|number[]")
            }).throwsAndHasTypeError(GroupOpen.unclosedMessage)
        })
        test("unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("string|number[]|boolean)")
            }).throwsAndHasTypeError(GroupClose.buildUnmatchedMessage(""))
        })
        test("lone )", () => {
            assert(() => {
                // @ts-expect-error
                type(")")
            }).throwsAndHasTypeError(
                Operand.buildExpressionExpectedMessage(")")
            )
        })
        test("lone (", () => {
            assert(() => {
                // @ts-expect-error
                type("(")
            }).throwsAndHasTypeError(Operand.buildExpressionExpectedMessage(""))
        })
        test("deep unmatched (", () => {
            assert(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2")
            }).throwsAndHasTypeError(GroupOpen.unclosedMessage)
        })
        test("deep unmatched )", () => {
            assert(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))[]")
            }).throwsAndHasTypeError(GroupClose.buildUnmatchedMessage("[]"))
        })
        test("starting )", () => {
            assert(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError(
                Operand.buildExpressionExpectedMessage(")number(")
            )
        })
    })
})

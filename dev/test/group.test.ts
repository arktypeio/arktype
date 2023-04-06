import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import {
    unclosedGroupMessage,
    writeUnmatchedGroupCloseMessage
} from "../../src/parse/string/reduce/shared.js"
import { writeExpressionExpectedMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("group", () => {
    it("entire expression", () => {
        attest(type("(string)").infer).typed as string
    })
    it("overrides default precedence", () => {
        attest(type("boolean|number[]").infer).typed as boolean | number[]
        attest(type("(boolean|number)[]").infer).typed as (boolean | number)[]
    })
    it("nested", () => {
        attest(type("((boolean|number)[]|(string|undefined)[])[]").infer)
            .typed as ((number | boolean)[] | (string | undefined)[])[]
    })
    describe("errors", () => {
        it("empty", () => {
            attest(() => {
                // @ts-expect-error
                type("()")
            }).throwsAndHasTypeError(writeExpressionExpectedMessage(")"))
        })
        it("unmatched (", () => {
            attest(() => {
                // @ts-expect-error
                type("string|(boolean|number[]")
            }).throwsAndHasTypeError(unclosedGroupMessage)
        })
        it("unmatched )", () => {
            attest(() => {
                // @ts-expect-error
                type("string|number[]|boolean)")
            }).throwsAndHasTypeError(writeUnmatchedGroupCloseMessage(""))
        })
        it("lone )", () => {
            attest(() => {
                // @ts-expect-error
                type(")")
            }).throwsAndHasTypeError(writeExpressionExpectedMessage(")"))
        })
        it("lone (", () => {
            attest(() => {
                // @ts-expect-error
                type("(")
            }).throwsAndHasTypeError(writeExpressionExpectedMessage(""))
        })
        it("deep unmatched (", () => {
            attest(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2")
            }).throwsAndHasTypeError(unclosedGroupMessage)
        })
        it("deep unmatched )", () => {
            attest(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))[]")
            }).throwsAndHasTypeError(writeUnmatchedGroupCloseMessage("[]"))
        })
        it("starting )", () => {
            attest(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError(writeExpressionExpectedMessage(")number("))
        })
    })
})

import { describe, it } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"
import {
    buildUnmatchedGroupCloseMessage,
    unclosedGroupMessage
} from "../src/parse/string/reduce/shared.ts"
import { buildExpressionExpectedMessage } from "../src/parse/string/shift/operand/unenclosed.ts"

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
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(")"))
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
            }).throwsAndHasTypeError(buildUnmatchedGroupCloseMessage(""))
        })
        it("lone )", () => {
            attest(() => {
                // @ts-expect-error
                type(")")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(")"))
        })
        it("lone (", () => {
            attest(() => {
                // @ts-expect-error
                type("(")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(""))
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
            }).throwsAndHasTypeError(buildUnmatchedGroupCloseMessage("[]"))
        })
        it("starting )", () => {
            attest(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(")number("))
        })
    })
})

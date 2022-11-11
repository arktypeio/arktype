import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../api.js"
import {
    buildUnmatchedGroupCloseMessage,
    unclosedGroupMessage
} from "../errors.js"
import { buildExpressionExpectedMessage } from "../operand/operand.js"

describe("group", () => {
    test("entire expression", () => {
        attest(type("(string)").infer).typed as string
    })
    test("overrides default precedence", () => {
        attest(type("boolean|number[]").infer).typed as boolean | number[]
        attest(type("(boolean|number)[]").infer).typed as (boolean | number)[]
    })
    test("nested", () => {
        attest(type("((boolean|number)[]|(string|undefined)[])[]").infer)
            .typed as ((number | boolean)[] | (string | undefined)[])[]
    })
    describe("errors", () => {
        test("empty", () => {
            attest(() => {
                // @ts-expect-error
                type("()")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(")"))
        })
        test("unmatched (", () => {
            attest(() => {
                // @ts-expect-error
                type("string|(boolean|number[]")
            }).throwsAndHasTypeError(unclosedGroupMessage)
        })
        test("unmatched )", () => {
            attest(() => {
                // @ts-expect-error
                type("string|number[]|boolean)")
            }).throwsAndHasTypeError(buildUnmatchedGroupCloseMessage(""))
        })
        test("lone )", () => {
            attest(() => {
                // @ts-expect-error
                type(")")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(")"))
        })
        test("lone (", () => {
            attest(() => {
                // @ts-expect-error
                type("(")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(""))
        })
        test("deep unmatched (", () => {
            attest(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2")
            }).throwsAndHasTypeError(unclosedGroupMessage)
        })
        test("deep unmatched )", () => {
            attest(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))[]")
            }).throwsAndHasTypeError(buildUnmatchedGroupCloseMessage("[]"))
        })
        test("starting )", () => {
            attest(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError(buildExpressionExpectedMessage(")number("))
        })
    })
})

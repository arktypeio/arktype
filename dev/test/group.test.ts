import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import {
    unclosedGroupMessage,
    writeUnmatchedGroupCloseMessage
} from "../../src/parse/string/reduce/shared.js"
import { writeExpressionExpectedMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("group", () => {
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
    suite("errors", () => {
        test("empty", () => {
            attest(() => {
                // @ts-expect-error
                type("()")
            }).throws(writeExpressionExpectedMessage(")"))
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
            }).throwsAndHasTypeError(writeUnmatchedGroupCloseMessage(""))
        })
        test("lone )", () => {
            attest(() => {
                // @ts-expect-error
                type(")")
            }).throws(writeExpressionExpectedMessage(")"))
        })
        test("lone (", () => {
            attest(() => {
                // @ts-expect-error
                type("(")
            }).throws(writeExpressionExpectedMessage(""))
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
            }).throwsAndHasTypeError(writeUnmatchedGroupCloseMessage("[]"))
        })
        test("starting )", () => {
            attest(() => {
                // @ts-expect-error
                type(")number(")
            }).throws(writeExpressionExpectedMessage(")number("))
        })
    })
})

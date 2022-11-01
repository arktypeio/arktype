import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { GroupOpen } from "../../operand/groupOpen.js"
import { Operand } from "../../operand/operand.js"
import { GroupClose } from "../groupClose.js"

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
            }).throwsAndHasTypeError(
                Operand.buildExpressionExpectedMessage(")")
            )
        })
        test("unmatched (", () => {
            attest(() => {
                // @ts-expect-error
                type("string|(boolean|number[]")
            }).throwsAndHasTypeError(GroupOpen.unclosedMessage)
        })
        test("unmatched )", () => {
            attest(() => {
                // @ts-expect-error
                type("string|number[]|boolean)")
            }).throwsAndHasTypeError(GroupClose.buildUnmatchedMessage(""))
        })
        test("lone )", () => {
            attest(() => {
                // @ts-expect-error
                type(")")
            }).throwsAndHasTypeError(
                Operand.buildExpressionExpectedMessage(")")
            )
        })
        test("lone (", () => {
            attest(() => {
                // @ts-expect-error
                type("(")
            }).throwsAndHasTypeError(Operand.buildExpressionExpectedMessage(""))
        })
        test("deep unmatched (", () => {
            attest(() => {
                // @ts-expect-error
                type("(null|(undefined|(1))|2")
            }).throwsAndHasTypeError(GroupOpen.unclosedMessage)
        })
        test("deep unmatched )", () => {
            attest(() => {
                // @ts-expect-error
                type("((string|number)[]|boolean))[]")
            }).throwsAndHasTypeError(GroupClose.buildUnmatchedMessage("[]"))
        })
        test("starting )", () => {
            attest(() => {
                // @ts-expect-error
                type(")number(")
            }).throwsAndHasTypeError(
                Operand.buildExpressionExpectedMessage(")number(")
            )
        })
    })
})

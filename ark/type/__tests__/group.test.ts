import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"
import {
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "../parser/string/reduce/shared.js"
import { writeExpressionExpectedMessage } from "../parser/string/shift/operand/unenclosed.js"

suite("group", () => {
	test("entire expression", () => {
		attest<string>(type("(string)").infer)
	})
	test("overrides default precedence", () => {
		attest<boolean | number[]>(type("boolean|number[]").infer)
		attest<(boolean | number)[]>(type("(boolean|number)[]").infer)
	})
	test("nested", () => {
		attest<((number | boolean)[] | (string | undefined)[])[]>(
			type("((boolean|number)[]|(string|undefined)[])[]").infer
		)
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
			}).throwsAndHasTypeError(writeUnclosedGroupMessage(")"))
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
			}).throwsAndHasTypeError(writeUnclosedGroupMessage(")"))
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

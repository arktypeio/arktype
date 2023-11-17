import { attest } from "@arktype/attest"
import { type } from "arktype"
import {
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "../parser/string/reduce/shared.ts"
import { writeExpressionExpectedMessage } from "../parser/string/shift/operand/unenclosed.ts"

describe("group", () => {
	it("entire expression", () => {
		attest<string>(type("(string)").infer)
	})
	it("overrides default precedence", () => {
		attest<boolean | number[]>(type("boolean|number[]").infer)
		attest<(boolean | number)[]>(type("(boolean|number)[]").infer)
	})
	it("nested", () => {
		attest<((number | boolean)[] | (string | undefined)[])[]>(
			type("((boolean|number)[]|(string|undefined)[])[]").infer
		)
	})
	describe("errors", () => {
		it("empty", () => {
			attest(() => {
				// @ts-expect-error
				type("()")
			}).throws(writeExpressionExpectedMessage(")"))
		})
		it("unmatched (", () => {
			attest(() => {
				// @ts-expect-error
				type("string|(boolean|number[]")
			}).throwsAndHasTypeError(writeUnclosedGroupMessage(")"))
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
			}).throws(writeExpressionExpectedMessage(")"))
		})
		it("lone (", () => {
			attest(() => {
				// @ts-expect-error
				type("(")
			}).throws(writeExpressionExpectedMessage(""))
		})
		it("deep unmatched (", () => {
			attest(() => {
				// @ts-expect-error
				type("(null|(undefined|(1))|2")
			}).throwsAndHasTypeError(writeUnclosedGroupMessage(")"))
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
			}).throws(writeExpressionExpectedMessage(")number("))
		})
	})
})

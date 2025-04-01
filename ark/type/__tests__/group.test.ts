import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import {
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "arktype/internal/parser/reduce/shared.ts"
import { writeExpressionExpectedMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("entire expression", () => {
		const T = type("(string)")
		const Expected = type("string")
		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("overrides default precedence", () => {
		const T = type("(boolean|number)[]")
		const Expected = type("boolean|number").array()
		attest<typeof Expected>(T)
		attest(T.json).equals(Expected.json)
	})

	it("nested", () => {
		attest<((number | boolean)[] | (string | undefined)[])[]>(
			type("((boolean|number)[]|(string|undefined)[])[]").infer
		)
	})

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

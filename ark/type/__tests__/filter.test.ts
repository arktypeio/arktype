import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	const parseNumber = (s: string) => Number(s)

	it("applies to input", () => {
		const stringIsLong = (s: string) => s.length > 5
		const parseLongNumber = type("string")
			.pipe(parseNumber)
			.filter(stringIsLong)

		attest<(In: string) => Out<number>>(parseLongNumber.t)

		attest(parseLongNumber.json).snap({
			in: { domain: "string", predicate: ["$ark.stringIsLong"] },
			morphs: ["$ark.parseNumber"]
		})

		attest(parseLongNumber("123456")).snap(123456)
		attest(parseLongNumber("123").toString()).snap(
			'must be valid according to stringIsLong (was "123")'
		)
		attest(parseLongNumber(123456).toString()).snap(
			"must be a string (was a number)"
		)
	})

	it("predicate inferred on input", () => {
		const stringIsIntegerLike = (s: string): s is `${bigint}` =>
			/^-?\d+$/.test(s)
		const parseIntegerLike = type("string")
			.pipe(parseNumber)
			.filter(stringIsIntegerLike)

		attest<(In: `${bigint}`) => Out<number>>(parseIntegerLike.t)

		attest(parseIntegerLike.json).snap({
			in: { domain: "string", predicate: ["$ark.stringIsIntegerLike"] },
			morphs: ["$ark.parseNumber"]
		})

		attest(parseIntegerLike("123456")).snap(123456)
		attest(parseIntegerLike("3.14159").toString()).snap(
			'must be valid according to stringIsIntegerLike (was "3.14159")'
		)
		attest(parseIntegerLike(123456).toString()).snap(
			"must be a string (was a number)"
		)
	})
})

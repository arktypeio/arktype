import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	const parseNumber = (s: string) => Number(s)

	it("applies to input", () => {
		const stringIsLong = (s: string) => s.length > 5
		const ParseLongNumber = type("string")
			.pipe(parseNumber)
			.filter(stringIsLong)

		attest<(In: string) => Out<number>>(ParseLongNumber.t)

		attest(ParseLongNumber.json).snap({
			in: { domain: "string", predicate: ["$ark.stringIsLong"] },
			morphs: ["$ark.parseNumber"]
		})

		attest(ParseLongNumber("123456")).snap(123456)
		attest(ParseLongNumber("123").toString()).snap(
			'must be valid according to stringIsLong (was "123")'
		)
		attest(ParseLongNumber(123456).toString()).snap(
			"must be a string (was a number)"
		)
	})

	it("predicate inferred on input", () => {
		const stringIsIntegerLike = (s: string): s is `${bigint}` =>
			/^-?\d+$/.test(s)
		const ParseIntegerLike = type("string")
			.pipe(parseNumber)
			.filter(stringIsIntegerLike)

		attest<(In: `${bigint}`) => Out<number>>(ParseIntegerLike.t)

		attest(ParseIntegerLike.json).snap({
			in: { domain: "string", predicate: ["$ark.stringIsIntegerLike"] },
			morphs: ["$ark.parseNumber"]
		})

		attest(ParseIntegerLike("123456")).snap(123456)
		attest(ParseIntegerLike("3.14159").toString()).snap(
			'must be valid according to stringIsIntegerLike (was "3.14159")'
		)
		attest(ParseIntegerLike(123456).toString()).snap(
			"must be a string (was a number)"
		)
	})
})

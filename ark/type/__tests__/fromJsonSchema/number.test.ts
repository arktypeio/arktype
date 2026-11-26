import { attest, contextualize } from "@ark/attest"
import { fromJsonSchema } from "arktype"

contextualize(() => {
	it("bounds", () => {
		attest(
			fromJsonSchema({ type: "number", minimum: 5, exclusiveMaximum: 10 })
				.expression
		).snap("5 <= number < 10")
		attest(
			fromJsonSchema({ type: "number", maximum: 5, exclusiveMaximum: 5 })
				.expression
		).snap("number < 5")
	})

	it("multipleOf", () => {
		attest(fromJsonSchema({ type: "integer", multipleOf: 5 }).expression).snap(
			"number % 5"
		)
	})

	it("draft-04 / OpenAPI 3.0 boolean exclusive bounds", () => {
		const Gt = fromJsonSchema({
			type: "number",
			minimum: 0,
			exclusiveMinimum: true
		})
		attest(Gt.expression).snap("number > 0")
		attest(Gt.allows(0)).equals(false)
		attest(Gt.allows(0.1)).equals(true)

		const Ge = fromJsonSchema({
			type: "number",
			minimum: 0,
			exclusiveMinimum: false
		})
		attest(Ge.expression).snap("number >= 0")
		attest(Ge.allows(0)).equals(true)

		const Lt = fromJsonSchema({
			type: "number",
			maximum: 10,
			exclusiveMaximum: true
		})
		attest(Lt.expression).snap("number < 10")
		attest(Lt.allows(10)).equals(false)
		attest(Lt.allows(9.9)).equals(true)

		const Le = fromJsonSchema({
			type: "number",
			maximum: 10,
			exclusiveMaximum: false
		})
		attest(Le.expression).snap("number <= 10")
		attest(Le.allows(10)).equals(true)

		// round-trips ArkType's own openapi-3.0 target output
		const oas = Gt.toJsonSchema({ target: "openapi-3.0" })
		attest(fromJsonSchema(oas).equals(Gt)).equals(true)

		attest(() =>
			// @ts-expect-error
			fromJsonSchema({ type: "number", exclusiveMinimum: true })
		).throws.snap(
			"ParseError: #/exclusiveMinimum can't be true without minimum"
		)
		attest(() =>
			// @ts-expect-error
			fromJsonSchema({ type: "number", exclusiveMaximum: true })
		).throws.snap(
			"ParseError: #/exclusiveMaximum can't be true without maximum"
		)
		attest(() =>
			fromJsonSchema({ type: "number", exclusiveMinimum: "0" } as never)
		).throws.snap(
			'ParseError: #/exclusiveMinimum must be a number or a boolean (was "0")'
		)

		// explicit draft-04 allows boolean exclusive bounds
		const Draft04Gt = fromJsonSchema({
			$schema: "http://json-schema.org/draft-04/schema#",
			type: "number",
			minimum: 0,
			exclusiveMinimum: true
		})
		attest(Draft04Gt.expression).snap("number > 0")

		// explicit draft-06 / draft-07 / 2019-09 / 2020-12 reject boolean exclusive bounds
		for (const $schema of [
			"http://json-schema.org/draft-06/schema#",
			"http://json-schema.org/draft-07/schema#",
			"https://json-schema.org/draft/2019-09/schema",
			"https://json-schema.org/draft/2020-12/schema"
		]) {
			attest(() =>
				fromJsonSchema({
					$schema,
					type: "number",
					minimum: 0,
					exclusiveMinimum: true
				} as never)
			).throws.snap(
				"ParseError: #/exclusiveMinimum must be a number (was true)"
			)
			attest(() =>
				fromJsonSchema({
					$schema,
					type: "number",
					maximum: 10,
					exclusiveMaximum: false
				} as never)
			).throws.snap(
				"ParseError: #/exclusiveMaximum must be a number (was false)"
			)
		}
	})
})

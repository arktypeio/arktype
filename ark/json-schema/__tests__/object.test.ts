import { attest, contextualize } from "@ark/attest"
import { jsonSchemaToType } from "@ark/json-schema"

contextualize(() => {
	it("type object", () => {
		const t = jsonSchemaToType({ type: "object" })
		attest(t.expression).snap("object")
		attest(t.allows({ foo: 3 })).equals(true)
		attest(t.allows([])).equals(false)
	})

	it("maxProperties", () => {
		const tMaxProperties = jsonSchemaToType({
			type: "object",
			maxProperties: 1
		})
		attest(tMaxProperties.allows({})).equals(true)
		attest(tMaxProperties.allows({ foo: 1 })).equals(true)
		attest(tMaxProperties.allows({ foo: 1, bar: 2 })).equals(false)
		attest(tMaxProperties.allows({ foo: 1, bar: 2, baz: 3 })).equals(false)
	})

	it("minProperties", () => {
		const tMinProperties = jsonSchemaToType({
			type: "object",
			minProperties: 2
		})
		attest(tMinProperties.allows({})).equals(false)
		attest(tMinProperties.allows({ foo: 1 })).equals(false)
		attest(tMinProperties.allows({ foo: 1, bar: 2 })).equals(true)
		attest(tMinProperties.allows({ foo: 1, bar: 2, baz: 3 })).equals(true)
	})

	it("minProperties of 1 message", () => {
		const T = jsonSchemaToType({ type: "object", minProperties: 1 })
		attest(() => T.assert({})).throws.snap(
			"TraversalError: must be an object with at least 1 property (was an object)"
		)
	})

	it("properties & required", () => {
		const tRequired = jsonSchemaToType({
			type: "object",
			properties: {
				foo: { type: "string" },
				bar: { type: "number" }
			},
			required: ["foo"]
		})
		attest(tRequired.expression).snap("{ foo: string, bar?: number }")

		attest(
			jsonSchemaToType({ type: "object", required: ["foo"] }).expression
		).snap("{ foo: unknown }")
		attest(
			jsonSchemaToType({
				type: "object",
				properties: { foo: { type: "string" } },
				// @ts-expect-error
				required: ["bar"]
			}).expression
		).snap("{ bar: unknown, foo?: string }")
		attest(() =>
			jsonSchemaToType({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo", "foo"]
			})
		).throws.snap(
			'ParseError: #/required must be an array of unique strings (was ["foo","foo"])'
		)
	})

	it("additionalProperties", () => {
		const tAdditionalProperties = jsonSchemaToType({
			type: "object",
			additionalProperties: { type: "number" },
			properties: { bar: { type: "string" } }
		})
		attest(tAdditionalProperties.allows({})).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1 })).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1, bar: "2" })).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1, baz: "2" })).equals(false)
	})

	it("patternProperties", () => {
		const tPatternProperties = jsonSchemaToType({
			type: "object",
			patternProperties: {
				"^[a-z]+$": { type: "string" }
			}
		})
		attest(tPatternProperties.expression).snap("{ [/^[a-z]+$/]: string }")
		attest(tPatternProperties.allows({})).equals(true)
		attest(tPatternProperties.allows({ foo: "bar" })).equals(true)
		attest(tPatternProperties.allows({ foo: 1 })).equals(false)
		attest(tPatternProperties.allows({ "123": "bar" })).equals(true) // true since by default JSON Schema allows additional properties
	})

	it("propertyNames", () => {
		const tPropertyNames = jsonSchemaToType({
			type: "object",
			propertyNames: { type: "string", minLength: 5 }
		})
		attest(tPropertyNames.allows({ abcde: 1 })).equals(true)
		attest(tPropertyNames.allows({ abcd: 1 })).equals(false)

		attest(() =>
			jsonSchemaToType({
				type: "object",
				// @ts-expect-error
				propertyNames: { type: "number" }
			})
		).type.errors.snap(
			"Type '\"number\"' is not assignable to type '\"string\"'."
		)
	})

	it("propertyNames & additionalProperties", () => {
		const tPropertyNamesAndAdditionalProperties = jsonSchemaToType({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			additionalProperties: true
		})
		attest(tPropertyNamesAndAdditionalProperties.allows({ abc: 1 })).equals(
			true
		)
		attest(tPropertyNamesAndAdditionalProperties.allows({ ab: 1 })).equals(
			false
		)
	})

	it("propertyNames & patternProperties", () => {
		const tPropertyNamesAndPatternPropertiesValid = jsonSchemaToType({
			type: "object",
			patternProperties: { foo: { type: "number" } },
			propertyNames: { type: "string", pattern: "foo" }
		})
		attest(
			tPropertyNamesAndPatternPropertiesValid.allows({ foo: 1, afoo: 2 })
		).equals(true)
		attest(tPropertyNamesAndPatternPropertiesValid.allows({ bar: 1 })).equals(
			false
		)
		attest(tPropertyNamesAndPatternPropertiesValid.allows({ foo: "1" })).equals(
			false
		)

		const tShorterPattern = jsonSchemaToType({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			patternProperties: { "^abcd": { type: "number" } }
		})
		attest(tShorterPattern.allows({ abcde: 1, xyz: true })).equals(true)
		attest(tShorterPattern.allows({ ab: 1 })).equals(false)
	})

	it("propertyNames & properties", () => {
		const tPropertyNamesAndProperties = jsonSchemaToType({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			properties: {
				a: { type: "boolean" },
				abc: { type: "number" }
			}
		})

		attest(tPropertyNamesAndProperties.allows({ abc: 1 })).equals(true)
		attest(tPropertyNamesAndProperties.allows({ a: true })).equals(false)
	})

	it("propertyNames & properties & required", () => {
		const tPropertyNamesAndRequiredValid = jsonSchemaToType({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			properties: { abc: { type: "number" } },
			required: ["abc"]
		})
		attest(tPropertyNamesAndRequiredValid.allows({ abc: 1 })).equals(true)
		attest(tPropertyNamesAndRequiredValid.allows({ abc: 1, ab: 1 })).equals(
			false
		)

		const tUnsatisfiable = jsonSchemaToType({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			properties: { a: { type: "boolean" } },
			required: ["a"]
		})
		attest(tUnsatisfiable.allows({ a: true })).equals(false)
	})

	it("required key declared by another branch", () => {
		const T = jsonSchemaToType({
			type: "object",
			allOf: [
				{ properties: { foo: { type: "string" } } },
				{ required: ["foo"] }
			]
		})
		attest(T.infer).type.toString.snap("{ foo: string }")
		attest(T.expression).snap("{ foo: string }")
	})

	it("required keys of untyped branches", () => {
		const T = jsonSchemaToType({
			type: "object",
			anyOf: [{ required: ["foo"] }, { required: ["bar"] }]
		})
		attest(T.infer).type.toString.snap("{ bar: unknown } | { foo: unknown }")
		attest(T.expression).snap("{ bar: unknown } | { foo: unknown }")
		attest(T.allows([])).equals(false)
	})
})

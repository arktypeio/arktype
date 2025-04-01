import { attest, contextualize } from "@ark/attest"
import {
	parseJsonSchema,
	writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage,
	writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage
} from "@ark/jsonschema"

contextualize(() => {
	it("type object", () => {
		const t = parseJsonSchema({ type: "object" })
		attest(t.expression).snap("{}")
		attest(t.allows({ foo: 3 }))
	})

	it("maxProperties", () => {
		const tMaxProperties = parseJsonSchema({
			type: "object",
			maxProperties: 1
		})
		attest(tMaxProperties.json).snap({
			domain: "object",
			predicate: ["$ark.jsonSchemaObjectMaxPropertiesValidator"]
		})
		attest(tMaxProperties.allows({})).equals(true)
		attest(tMaxProperties.allows({ foo: 1 })).equals(true)
		attest(tMaxProperties.allows({ foo: 1, bar: 2 })).equals(false)
		attest(tMaxProperties.allows({ foo: 1, bar: 2, baz: 3 })).equals(false)
	})

	it("minProperties", () => {
		const tMinProperties = parseJsonSchema({
			type: "object",
			minProperties: 2
		})
		attest(tMinProperties.json).snap({
			domain: "object",
			predicate: ["$ark.jsonSchemaObjectMinPropertiesValidator"]
		})
		attest(tMinProperties.allows({})).equals(false)
		attest(tMinProperties.allows({ foo: 1 })).equals(false)
		attest(tMinProperties.allows({ foo: 1, bar: 2 })).equals(true)
		attest(tMinProperties.allows({ foo: 1, bar: 2, baz: 3 })).equals(true)
	})

	it("properties & required", () => {
		const tRequired = parseJsonSchema({
			type: "object",
			properties: {
				foo: { type: "string" },
				bar: { type: "number" }
			},
			required: ["foo"]
		})
		attest(tRequired.expression).snap("{ foo: string, bar?: number }")

		attest(() => parseJsonSchema({ type: "object", required: ["foo"] })).throws(
			"TraversalError: must be a valid object JSON Schema (was an object JSON Schema with 'required' array but no 'properties' object)"
		)
		attest(() =>
			parseJsonSchema({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["bar"]
			})
		).throws(
			`TraversalError: required must be a key from the 'properties' object, i.e. foo (was bar)`
		)
		attest(() =>
			parseJsonSchema({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo", "foo"]
			})
		).throws(
			`TraversalError: required must be an array of unique strings (was an array with the following duplicates: [{"element":"foo","indices":[0,1]}])`
		)
	})

	it("additionalProperties", () => {
		const tAdditionalProperties = parseJsonSchema({
			type: "object",
			additionalProperties: { type: "number" },
			properties: { bar: { type: "string" } }
		})
		attest(tAdditionalProperties.json).snap({
			domain: "object",
			optional: [{ key: "bar", value: "string" }],
			predicate: ["$ark.jsonSchemaObjectAdditionalPropertiesValidator"]
		})
		attest(tAdditionalProperties.allows({})).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1 })).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1, bar: "2" })).equals(true)
		attest(tAdditionalProperties.allows({ foo: 1, baz: "2" })).equals(false)
	})

	it("patternProperties", () => {
		const tPatternProperties = parseJsonSchema({
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
		const tPropertyNames = parseJsonSchema({
			type: "object",
			propertyNames: { type: "string", minLength: 5 }
		})
		attest(tPropertyNames.expression).snap(
			"{ [string >= 5]: unknown, + (undeclared): reject }"
		)

		attest(() =>
			// @ts-expect-error
			parseJsonSchema({
				type: "object",
				propertyNames: { type: "number" }
			})
		).type.errors.snap(
			`Argument of type '{ type: "object"; propertyNames: { type: "number"; }; }' is not assignable to parameter of type 'JsonSchemaOrBoolean'.` +
				`The types of 'propertyNames.type' are incompatible between these types.` +
				`Type '"number"' is not assignable to type '"string"'.`
		)
	})

	it("propertyNames & additionalProperties", () => {
		const tPropertyNamesAndAdditionalProperties = parseJsonSchema({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			additionalProperties: true
		})
		attest(tPropertyNamesAndAdditionalProperties.expression).snap(
			"{ [string >= 3]: unknown, + (undeclared): reject }"
		)
	})

	it("propertyNames & patternProperties", () => {
		const tPropertyNamesAndPatternPropertiesValid = parseJsonSchema({
			type: "object",
			patternProperties: { foo: { type: "number" } },
			propertyNames: { type: "string", pattern: "foo" }
		})
		attest(tPropertyNamesAndPatternPropertiesValid.expression).snap(
			"{ [/foo/]: number, [/foo/]: unknown, + (undeclared): reject }"
		)

		attest(() => {
			parseJsonSchema({
				type: "object",
				propertyNames: { type: "string", minLength: 3 },
				patternProperties: { "^abcd": { type: "number" } }
			})
		}).throws(
			writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage(
				"/^abcd/",
				"string >= 3"
			)
		)
	})

	it("propertyNames & properties", () => {
		const tPropertyNamesAndProperties = parseJsonSchema({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			properties: {
				a: { type: "boolean" },
				abc: { type: "number" }
			}
		})

		attest(tPropertyNamesAndProperties.expression).snap(
			"{ [string >= 3]: unknown, a?: never, abc?: number, + (undeclared): reject }"
		)
	})

	it("propertyNames & properties & required", () => {
		const tPropertyNamesAndRequiredValid = parseJsonSchema({
			type: "object",
			propertyNames: { type: "string", minLength: 3 },
			properties: { abc: { type: "number" } },
			required: ["abc"]
		})
		attest(tPropertyNamesAndRequiredValid.expression).snap(
			"{ [string >= 3]: unknown, abc: number, + (undeclared): reject }"
		)

		attest(() =>
			parseJsonSchema({
				type: "object",
				propertyNames: { type: "string", minLength: 3 },
				properties: { a: { type: "boolean" } },
				required: ["a"]
			})
		).throws(
			writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage(
				"a",
				"string >= 3"
			)
		)
	})
})

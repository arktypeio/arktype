import {
	ArkErrors,
	rootSchema,
	type Intersection,
	type Predicate,
	type TraversalContext
} from "@ark/schema"
import { printable, type show } from "@ark/util"
import type { Type } from "arktype"

import { innerParseJsonSchema, type inferJsonSchema } from "./json.ts"
import { JsonSchema } from "./scope.ts"

const parseMinMaxProperties = (
	jsonSchema: JsonSchema.ObjectSchema,
	ctx: TraversalContext
) => {
	const predicates: Predicate.Schema[] = []
	if ("maxProperties" in jsonSchema) {
		const maxProperties = jsonSchema.maxProperties

		if ((jsonSchema.required?.length ?? 0) > maxProperties) {
			ctx.reject({
				message: `The specified JSON Schema requires at least ${jsonSchema.required?.length} properties, which exceeds the specified maxProperties of ${jsonSchema.maxProperties}.`
			})
		}
		predicates.push((data: object, ctx) => {
			const keys = Object.keys(data)
			return keys.length <= maxProperties ?
					true
				:	ctx.reject({
						expected: `at most ${maxProperties} propert${maxProperties === 1 ? "y" : "ies"}`,
						actual: keys.length.toString()
					})
		})
	}
	if ("minProperties" in jsonSchema) {
		const minProperties = jsonSchema.minProperties
		predicates.push((data: object, ctx) => {
			const keys = Object.keys(data)
			return keys.length >= minProperties ?
					true
				:	ctx.reject({
						expected: `at least ${minProperties} propert${minProperties === 1 ? "y" : "ies"}`,
						actual: keys.length.toString()
					})
		})
	}
	return predicates
}

const parsePatternProperties = (
	jsonSchema: JsonSchema.ObjectSchema,
	ctx: TraversalContext
) => {
	if (!("patternProperties" in jsonSchema)) return

	const patternProperties = Object.entries(jsonSchema.patternProperties).map(
		([key, value]) =>
			[new RegExp(key), innerParseJsonSchema.assert(value)] as const
	)

	// Ensure that the schema for any property is compatible with any corresponding patternProperties
	patternProperties.forEach(([pattern, parsedPatternPropertySchema]) => {
		Object.entries(jsonSchema.properties ?? {}).forEach(
			([property, schemaForProperty]) => {
				if (!pattern.test(property)) return

				const parsedPropertySchema =
					innerParseJsonSchema.assert(schemaForProperty)

				if (!parsedPropertySchema.overlaps(parsedPatternPropertySchema)) {
					ctx.reject({
						message: `property ${property} must have a schema that overlaps with the patternProperty ${pattern}`
					})
				}
			}
		)
	})

	// NB: We don't validate compatability of schemas for overlapping patternProperties
	// since getting the intersection of regexes is inherenetly difficult.
	return (data: object, ctx: TraversalContext) => {
		const errors: false[] = []

		Object.entries(data).forEach(([dataKey, dataValue]) => {
			patternProperties.forEach(([pattern, parsedJsonSchema]) => {
				if (pattern.test(dataKey) && !parsedJsonSchema.allows(dataValue)) {
					errors.push(
						ctx.reject({
							actual: dataValue,
							expected: `${parsedJsonSchema.description} as property ${dataKey} matches patternProperty ${pattern}`
						})
					)
				}
			})
		})
		return errors.length === 0
	}
}

const parsePropertyNames = (
	jsonSchema: JsonSchema.ObjectSchema,
	ctx: TraversalContext
) => {
	if (!("propertyNames" in jsonSchema)) return

	const propertyNamesValidator = innerParseJsonSchema.assert(
		jsonSchema.propertyNames
	)

	if (
		"domain" in propertyNamesValidator.json &&
		propertyNamesValidator.json.domain !== "string"
	) {
		ctx.reject({
			path: ["propertyNames"],
			actual: `a schema for validating a ${propertyNamesValidator.json.domain as string}`,
			expected: "a schema for validating a string"
		})
	}

	return (data: object, ctx: TraversalContext) => {
		const errors: false[] = []

		Object.keys(data).forEach(key => {
			if (!propertyNamesValidator.allows(key)) {
				errors.push(
					ctx.reject({
						message: `property ${key} doesn't adhere to the propertyNames schema of ${propertyNamesValidator.description}`
					})
				)
			}
		})
		return errors.length === 0
	}
}

const parseRequiredAndOptionalKeys = (
	jsonSchema: JsonSchema.ObjectSchema,
	ctx: TraversalContext
) => {
	const optionalKeys: string[] = []
	const requiredKeys: string[] = []
	if ("properties" in jsonSchema) {
		if ("required" in jsonSchema) {
			if (jsonSchema.required.length !== new Set(jsonSchema.required).size) {
				ctx.reject({
					expected: "an array of unique strings",
					path: ["required"]
				})
			}

			for (const key of jsonSchema.required) {
				if (key in jsonSchema.properties) requiredKeys.push(key)
				else {
					ctx.reject({
						actual: key,
						expected: "a key in the 'properties' object",
						path: ["required"]
					})
				}
			}
			for (const key in jsonSchema.properties)
				if (!jsonSchema.required.includes(key)) optionalKeys.push(key)
		} else {
			// If 'required' is not present, all keys are optional
			optionalKeys.push(...Object.keys(jsonSchema.properties))
		}
	} else if ("required" in jsonSchema) {
		ctx.reject({
			actual:
				"an object JSON Schema with 'required' array but no 'properties' object",
			expected: "a valid object JSON Schema"
		})
	}

	return {
		optionalKeys: optionalKeys.map(key => ({
			key,
			value: innerParseJsonSchema.assert(jsonSchema.properties![key]).internal
		})),
		requiredKeys: requiredKeys.map(key => ({
			key,
			value: innerParseJsonSchema.assert(jsonSchema.properties![key]).internal
		}))
	}
}

const parseAdditionalProperties = (jsonSchema: JsonSchema.ObjectSchema) => {
	if (!("additionalProperties" in jsonSchema)) return

	const properties =
		jsonSchema.properties ? Object.keys(jsonSchema.properties) : []
	const patternProperties = Object.keys(jsonSchema.patternProperties ?? {})

	const additionalPropertiesSchema = jsonSchema.additionalProperties
	if (additionalPropertiesSchema === true) return

	return (data: object, ctx: TraversalContext) => {
		const errors: false[] = []

		Object.keys(data).forEach(key => {
			if (
				properties.includes(key) ||
				patternProperties.find(pattern => new RegExp(pattern).test(key))
			)
				// Not an additional property, so don't validate here
				return

			if (additionalPropertiesSchema === false) {
				errors.push(
					ctx.reject({
						message: `property ${key} is an additional property, which the provided schema does not allow`
					})
				)
				return
			}

			const additionalPropertyValidator = innerParseJsonSchema.assert(
				additionalPropertiesSchema
			)

			const value = data[key as keyof typeof data]
			if (!additionalPropertyValidator.allows(value)) {
				errors.push(
					ctx.reject({
						problem: `property ${key} is an additional property so must adhere to additional property schema of ${additionalPropertyValidator.description} (was ${printable(value)})`
					})
				)
			}
		})
		return errors.length === 0
	}
}

export const validateJsonSchemaObject = JsonSchema.ObjectSchema.pipe(
	(jsonSchema, ctx): Type<object> => {
		const arktypeObjectSchema: Intersection.Schema<object> = {
			domain: "object"
		}

		const { requiredKeys, optionalKeys } = parseRequiredAndOptionalKeys(
			jsonSchema,
			ctx
		)
		arktypeObjectSchema.required = requiredKeys
		arktypeObjectSchema.optional = optionalKeys

		const predicates: Predicate.Schema[] = [
			...parseMinMaxProperties(jsonSchema, ctx),
			parsePropertyNames(jsonSchema, ctx),
			parsePatternProperties(jsonSchema, ctx),
			parseAdditionalProperties(jsonSchema)
		].filter(x => x !== undefined)

		const typeWithoutPredicates = rootSchema(arktypeObjectSchema)
		if (predicates.length === 0) return typeWithoutPredicates as never

		return rootSchema({ domain: "object", predicate: predicates }).narrow(
			(obj: object, innerCtx) => {
				const validationResult = typeWithoutPredicates(obj)
				if (validationResult instanceof ArkErrors) {
					innerCtx.errors.merge(validationResult)
					return false
				}
				return true
			}
		) as never
	}
)

type inferAdditionalProperties<objectSchema> =
	objectSchema["additionalProperties" & keyof objectSchema] extends (
		JsonSchema.Schema
	) ?
		objectSchema["additionalProperties" & keyof objectSchema] extends false ?
			// false means no additional properties are allowed,
			// which is the default in TypeScript so just return the current type.
			unknown
		:	{
				// It's not possible in TS to accurately infer additional properties
				// so we use `unknown` to at least allow unspecified properties.
				[key: string]: unknown
			}
	:	never // TODO: Throw type error

type inferRequiredProperties<objectSchema> = {
	[P in (objectSchema["required" & keyof objectSchema] &
		string[])[number]]: P extends (
		keyof objectSchema["properties" & keyof objectSchema]
	) ?
		objectSchema["properties" & keyof objectSchema][P] extends (
			JsonSchema.Schema
		) ?
			inferJsonSchema<objectSchema["properties" & keyof objectSchema][P]>
		:	never // TODO: Throw type error
	:	never // TODO: Throw type error
}

type inferOptionalProperties<objectSchema> = {
	[P in keyof objectSchema["properties" &
		keyof objectSchema]]?: objectSchema["properties" &
		keyof objectSchema][P] extends JsonSchema.Schema ?
		inferJsonSchema<objectSchema["properties" & keyof objectSchema][P]>
	:	never // TODO: Throw type error
}

// NB: We don't infer `patternProperties` or 'patternProperties' since regex index signatures are not supported in TS
export type inferJsonSchemaObject<objectSchema, T = unknown> =
	"properties" extends keyof objectSchema ?
		"required" extends keyof objectSchema ?
			inferJsonSchemaObject<
				Omit<objectSchema, "required" | "properties"> & {
					properties: Omit<
						// Remove the required keys
						objectSchema["properties"],
						(objectSchema["required"] & string[])[number]
					>
				},
				inferRequiredProperties<objectSchema>
			>
		:	// 'required' isn't present, so all properties are optional
			inferJsonSchemaObject<
				Omit<objectSchema, "properties">,
				inferOptionalProperties<objectSchema> extends (
					Record<PropertyKey, never>
				) ?
					T
				:	T & inferOptionalProperties<objectSchema>
			>
	: "additionalProperties" extends keyof objectSchema ?
		show<T & inferAdditionalProperties<objectSchema>>
	:	// additionalProperties isn't present in the schema, which JSON Schema explicitly
		// states means extra properties are allowed, so update types accordingly.
		show<T & { [key: string]: JsonSchema.Json }>

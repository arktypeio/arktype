import {
	ArkErrors,
	rootSchema,
	type Intersection,
	type Predicate,
	type TraversalContext
} from "@ark/schema"
import { conflatenateAll, printable } from "@ark/util"
import type { Out, Type } from "arktype"

import { parseJsonSchema } from "./json.ts"
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
				expected: `an object JSON Schema with at most ${jsonSchema.maxProperties} required properties`,
				actual: `an object JSON Schema with ${jsonSchema.required!.length} required properties`
			})
		}
		predicates.push((data: object, ctx) => {
			const keys = Object.keys(data)
			return keys.length <= maxProperties ?
					true
				:	ctx.reject({
						expected: `an object with at most ${maxProperties} propert${maxProperties === 1 ? "y" : "ies"}`,
						actual: `an object with ${keys.length.toString()} propert${maxProperties === 1 ? "y" : "ies"}`
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
						expected: `an object with at least ${minProperties} propert${minProperties === 1 ? "y" : "ies"}`,
						actual: `an object with ${keys.length.toString()} propert${minProperties === 1 ? "y" : "ies"}`
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
		([key, value]) => [new RegExp(key), parseJsonSchema(value)] as const
	)

	// Ensure that the schema for any property is compatible with any corresponding patternProperties
	patternProperties.forEach(([pattern, parsedPatternPropertySchema]) => {
		Object.entries(jsonSchema.properties ?? {}).forEach(
			([property, schemaForProperty]) => {
				if (!pattern.test(property)) return

				const parsedPropertySchema = parseJsonSchema(schemaForProperty)

				if (!parsedPropertySchema.overlaps(parsedPatternPropertySchema)) {
					ctx.reject({
						path: [property],
						expected: `a JSON Schema that overlaps with the schema for patternProperty ${pattern} (${parsedPatternPropertySchema.description})`,
						actual: parsedPropertySchema.description
					})
				}
			}
		)
	})

	// NB: We don't validate compatability of schemas for overlapping patternProperties
	// since getting the intersection of regexes is inherently non-trivial.
	return (data: object, ctx: TraversalContext) => {
		Object.entries(data).forEach(([dataKey, dataValue]) => {
			patternProperties.forEach(([pattern, parsedJsonSchema]) => {
				if (pattern.test(dataKey) && !parsedJsonSchema.allows(dataValue)) {
					ctx.reject({
						path: [dataKey],
						expected: `${parsedJsonSchema.description}, as property ${dataKey} matches patternProperty ${pattern}`,
						actual: printable(dataValue)
					})
				}
			})
		})
		return ctx.hasError()
	}
}

const parsePropertyNames = (
	jsonSchema: JsonSchema.ObjectSchema,
	ctx: TraversalContext
) => {
	if (!("propertyNames" in jsonSchema)) return

	const propertyNamesValidator = parseJsonSchema(jsonSchema.propertyNames)

	if (
		"domain" in propertyNamesValidator.json &&
		propertyNamesValidator.json.domain !== "string"
	) {
		ctx.reject({
			path: ["propertyNames"],
			expected: "a schema for validating a string",
			actual: `a schema for validating a ${printable(propertyNamesValidator.json.domain)}`
		})
	}

	return (data: object, ctx: TraversalContext) => {
		Object.keys(data).forEach(key => {
			if (!propertyNamesValidator.allows(key)) {
				ctx.reject({
					path: [key],
					expected: `a key adhering to the propertyNames schema of ${propertyNamesValidator.description}`,
					actual: key
				})
			}
		})
		return ctx.hasError()
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
					path: ["required"],
					expected: "an array of unique strings",
					actual: printable(jsonSchema.required)
				})
			}

			for (const key of jsonSchema.required) {
				if (key in jsonSchema.properties) requiredKeys.push(key)
				else {
					ctx.reject({
						path: ["required"],
						expected: `a key from the 'properties' object (one of ${printable(Object.keys(jsonSchema.properties))})`,
						actual: key
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
			expected: "a valid object JSON Schema",
			actual:
				"an object JSON Schema with 'required' array but no 'properties' object"
		})
	}

	return {
		optionalKeys: optionalKeys.map(key => ({
			key,
			value: parseJsonSchema(jsonSchema.properties![key]).internal
		})),
		requiredKeys: requiredKeys.map(key => ({
			key,
			value: parseJsonSchema(jsonSchema.properties![key]).internal
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
		Object.keys(data).forEach(key => {
			if (
				properties.includes(key) ||
				patternProperties.find(pattern => new RegExp(pattern).test(key))
			)
				// Not an additional property, so don't validate here
				return

			if (additionalPropertiesSchema === false) {
				ctx.reject({
					expected:
						"an object with no additional keys, since provided additionalProperties JSON Schema doesn't allow it",
					actual: `an additional key (${key})`
				})
				return
			}

			const additionalPropertyValidator = parseJsonSchema(
				additionalPropertiesSchema
			)

			const value = data[key as keyof typeof data]
			if (!additionalPropertyValidator.allows(value)) {
				ctx.reject({
					path: [key],
					expected: `${additionalPropertyValidator.description}, since ${key} is an additional property.`,
					actual: printable(value)
				})
			}
		})
		return ctx.hasError()
	}
}

export const validateJsonSchemaObject: Type<
	(In: JsonSchema.ObjectSchema) => Out<Type<object, any>>,
	any
> = JsonSchema.ObjectSchema.pipe((jsonSchema, ctx): Type<object> => {
	const arktypeObjectSchema: Intersection.Schema<object> = {
		domain: "object"
	}

	const { requiredKeys, optionalKeys } = parseRequiredAndOptionalKeys(
		jsonSchema,
		ctx
	)
	arktypeObjectSchema.required = requiredKeys
	arktypeObjectSchema.optional = optionalKeys

	const predicates = conflatenateAll<Predicate.Schema>(
		...parseMinMaxProperties(jsonSchema, ctx),
		parsePropertyNames(jsonSchema, ctx),
		parsePatternProperties(jsonSchema, ctx),
		parseAdditionalProperties(jsonSchema)
	)

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
})
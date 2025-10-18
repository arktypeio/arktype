import {
	describeBranches,
	node,
	rootSchema,
	type Index,
	type Intersection,
	type Predicate,
	type Traversal
} from "@ark/schema"
import { getDuplicatesOf, printable, throwParseError } from "@ark/util"
import { type, type JsonSchema, type Out, type Type } from "arktype"

import {
	writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage,
	writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage
} from "./errors.ts"
import { jsonSchemaToType } from "./json.ts"
import { JsonSchemaScope } from "./scope.ts"

const parseMinMaxProperties = (
	jsonSchema: JsonSchema.Object,
	ctx: Traversal
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

		const jsonSchemaObjectMaxPropertiesValidator = (
			data: object,
			ctx: Traversal
		) => {
			const keys = Object.keys(data)
			return keys.length <= maxProperties ?
					true
				:	ctx.reject({
						expected: `an object with at most ${maxProperties} propert${maxProperties === 1 ? "y" : "ies"}`,
						actual: `an object with ${keys.length.toString()} propert${maxProperties === 1 ? "y" : "ies"}`
					})
		}
		predicates.push(jsonSchemaObjectMaxPropertiesValidator)
	}
	if ("minProperties" in jsonSchema) {
		const minProperties = jsonSchema.minProperties

		const jsonSchemaObjectMinPropertiesValidator = (
			data: object,
			ctx: Traversal
		) => {
			const keys = Object.keys(data)
			return keys.length >= minProperties ?
					true
				:	ctx.reject({
						expected: `an object with at least ${minProperties} propert${minProperties === 1 ? "y" : "ies"}`,
						actual: `an object with ${keys.length.toString()} propert${minProperties === 1 ? "y" : "ies"}`
					})
		}
		predicates.push(jsonSchemaObjectMinPropertiesValidator)
	}
	return predicates
}

const parsePatternProperties = (jsonSchema: JsonSchema.Object) => {
	if (!("patternProperties" in jsonSchema)) return

	const patternProperties = Object.entries(jsonSchema.patternProperties).map(
		([key, value]) => [new RegExp(key), jsonSchemaToType(value)] as const
	)

	// NB: We don't validate compatibility of schemas for overlapping patternProperties
	// since getting the intersection of regexes is inherently non-trivial.
	const indexSchemas = patternProperties.map(
		([pattern, parsedPatternPropertySchema]) => ({
			signature: { domain: "string" as const, pattern: [pattern] },
			value: parsedPatternPropertySchema.internal
		})
	)
	return indexSchemas
}

const parsePropertyNames = (jsonSchema: JsonSchema.Object) => {
	if (!("propertyNames" in jsonSchema)) return
	const propertyNamesValidator = jsonSchemaToType(jsonSchema.propertyNames)
	return propertyNamesValidator.internal
}

const parseRequiredAndOptionalKeys = (
	jsonSchema: JsonSchema.Object,
	ctx: Traversal
) => {
	const optionalKeys: string[] = []
	const requiredKeys: string[] = []
	if ("properties" in jsonSchema) {
		if ("required" in jsonSchema) {
			for (const key of jsonSchema.required) {
				if (key in jsonSchema.properties) requiredKeys.push(key)
				else {
					ctx.reject({
						path: ["required"],
						expected: `a key from the 'properties' object, i.e. ${describeBranches(Object.keys(jsonSchema.properties))}`,
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
			value: jsonSchemaToType(jsonSchema.properties![key]).internal
		})),
		requiredKeys: requiredKeys.map(key => ({
			key,
			value: jsonSchemaToType(jsonSchema.properties![key]).internal
		}))
	}
}

const parseAdditionalProperties = (jsonSchema: JsonSchema.Object) => {
	if (!("additionalProperties" in jsonSchema)) return

	const properties =
		jsonSchema.properties ? Object.keys(jsonSchema.properties) : []
	const patternProperties = Object.keys(jsonSchema.patternProperties ?? {})

	const additionalPropertiesSchema = jsonSchema.additionalProperties
	if (additionalPropertiesSchema === true) return true
	if (additionalPropertiesSchema === false) return false

	const schemaDefinedKeys = rootSchema(
		[...properties]
			.map(key => ({ unit: key }))
			.concat(
				[...patternProperties].map(key => ({
					domain: "string",
					pattern: key
				})) as never
			)
	)

	const jsonSchemaObjectAdditionalPropertiesValidator = (
		data: object,
		ctx: Traversal
	) => {
		for (const key of Object.keys(data)) {
			if (schemaDefinedKeys.allows(key))
				// not an additional property, so don't validate here
				continue

			const additionalPropertyValidator = jsonSchemaToType(
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
		}
		return !ctx.hasError()
	}
	return jsonSchemaObjectAdditionalPropertiesValidator
}

export const parseObjectJsonSchema: Type<
	(In: JsonSchema.Object) => Out<Type<object, any>>,
	any
> = JsonSchemaScope.ObjectSchema.pipe((jsonSchema, ctx): Type<object> => {
	const arktypeObjectSchema: Intersection.Schema<object> = {
		domain: "object"
	}

	const { requiredKeys, optionalKeys } = parseRequiredAndOptionalKeys(
		jsonSchema,
		ctx
	)
	const patternPropertiesIndexes: Index.Schema[] =
		parsePatternProperties(jsonSchema) ?? []

	const parsedPropertyNamesSchema = parsePropertyNames(jsonSchema)
	if (parsedPropertyNamesSchema === undefined) {
		arktypeObjectSchema.required = requiredKeys
		arktypeObjectSchema.optional = optionalKeys
		arktypeObjectSchema.index = patternPropertiesIndexes
	} else {
		const propertyNamesIndex = {
			signature: parsedPropertyNamesSchema,
			value: type.unknown.internal
		}

		// Ensure all 'patternProperties' adhere to the 'propertyNames' schema
		const propertyNamesNode = node("index", propertyNamesIndex)
		for (const patternPropertyIndex of patternPropertiesIndexes) {
			const patternPropertyNode = node("index", patternPropertyIndex)

			if (!patternPropertyNode.signature.extends(propertyNamesNode.signature)) {
				throwParseError(
					writeJsonSchemaObjectNonConformingPatternAndPropertyNamesMessage(
						patternPropertyNode.signature.expression,
						parsedPropertyNamesSchema.expression
					)
				)
			}
		}

		// Ensure all required keys adhere to the 'propertyNames' schema
		for (const requiredKey of requiredKeys) {
			if (!parsedPropertyNamesSchema.allows(requiredKey.key)) {
				throwParseError(
					writeJsonSchemaObjectNonConformingKeyAndPropertyNamesMessage(
						requiredKey.key,
						parsedPropertyNamesSchema.expression
					)
				)
			}
		}
		arktypeObjectSchema.required = requiredKeys

		// Update the value of optional keys that doen't adhere to the 'propertyNames' to be 'never'
		arktypeObjectSchema.optional = optionalKeys.map(optionalKey =>
			parsedPropertyNamesSchema.allows(optionalKey.key) ? optionalKey : (
				{ ...optionalKey, value: type.never.internal }
			)
		)

		// Set the 'propertyNames' constraints
		arktypeObjectSchema.index = [
			...patternPropertiesIndexes,
			{
				signature: parsedPropertyNamesSchema,
				value: type.unknown.internal
			}
		]
		arktypeObjectSchema.undeclared = "reject"
	}

	const potentialPredicates: (Predicate.Schema | undefined)[] =
		parseMinMaxProperties(jsonSchema, ctx)

	const additionalProperties = parseAdditionalProperties(jsonSchema)
	if (typeof additionalProperties === "boolean") {
		arktypeObjectSchema.undeclared ??=
			additionalProperties ? "ignore" : "reject"
	} else potentialPredicates.push(additionalProperties)

	const predicates = potentialPredicates.filter(
		potentialPredicate => potentialPredicate !== undefined
	)

	const typeWithoutPredicates = rootSchema(arktypeObjectSchema)
	if (predicates.length === 0) return typeWithoutPredicates as never
	return rootSchema({ ...arktypeObjectSchema, predicate: predicates }) as never
})

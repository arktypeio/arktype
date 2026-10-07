import {
	describeBranches,
	rootSchema,
	type Intersection,
	type makeRootAndArrayPropertiesMutable,
	type Predicate,
	type Traversal
} from "@ark/schema"
import { printable, throwParseError, type array, type Json } from "@ark/util"
import { type, type JsonSchema, type Out, type Type } from "arktype"
import {
	writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage,
	writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage
} from "./errors.ts"
import { jsonSchemaToType, type inferJsonSchema } from "./json.ts"
import { JsonSchemaScope } from "./scope.ts"

type inferArrayOfJsonSchema<tuple extends array<JsonSchema>> =
	makeRootAndArrayPropertiesMutable<{
		[index in keyof tuple]: inferJsonSchema<tuple[index]>
	}>

type inferJsonSchemaArrayItems<arrayItemsSchema> =
	arrayItemsSchema extends array ?
		arrayItemsSchema["length"] extends 0 ?
			// JSON Schema explicitly states that {items: []} means "an array of anything"
			// https://json-schema.org/understanding-json-schema/reference/array#items
			Json[]
		: arrayItemsSchema extends array<JsonSchema> ?
			inferArrayOfJsonSchema<arrayItemsSchema>
		:	never
	:	inferJsonSchema<arrayItemsSchema>[]

type inferJsonSchemaPrefixWithAdditionalItems<
	arraySchema,
	prefixKey,
	additionalKey
> =
	arraySchema[prefixKey & keyof arraySchema] extends array ?
		arraySchema[additionalKey & keyof arraySchema] extends false ?
			inferJsonSchemaArrayItems<arraySchema[prefixKey & keyof arraySchema]>
		:	inferJsonSchemaArrayItems<
				[
					...arraySchema[prefixKey & keyof arraySchema],
					...(arraySchema[additionalKey & keyof arraySchema] extends array ?
						arraySchema[additionalKey & keyof arraySchema]
					:	arraySchema[additionalKey & keyof arraySchema][])
				]
			>
	:	never
export type inferJsonSchemaArray<arraySchema, T extends unknown[] = unknown[]> =
	"prefixItems" extends keyof arraySchema ?
		"additionalItems" extends keyof arraySchema ?
			"items" extends keyof arraySchema ?
				never
			:	inferJsonSchemaPrefixWithAdditionalItems<
					arraySchema,
					"prefixItems",
					"additionalItems"
				>
		: "items" extends keyof arraySchema ?
			inferJsonSchemaPrefixWithAdditionalItems<
				arraySchema,
				"prefixItems",
				"items"
			>
		:	// @ts-expect-error This type resolves despite giving a 'excessively deep and possibly infinite' error
			[...inferJsonSchemaArrayItems<arraySchema["prefixItems"]>, ...unknown[]]
	: "additionalItems" extends keyof arraySchema ?
		"items" extends keyof arraySchema ?
			inferJsonSchemaPrefixWithAdditionalItems<
				arraySchema,
				"items",
				"additionalItems"
			>
		:	inferJsonSchemaArrayItems<arraySchema["additionalItems"]> // only has additionalItems
	: "items" extends (
		keyof arraySchema // only has items
	) ?
		inferJsonSchemaArrayItems<arraySchema["items"]>
	: T extends array ? T
	: unknown[]

const deepNormalize = (data: unknown): unknown =>
	typeof data === "object" ?
		data === null ? null
		: Array.isArray(data) ? data.map(item => deepNormalize(item))
		: Object.fromEntries(
				Object.entries(data)
					.map(([k, v]) => [k, deepNormalize(v)] as const)
					.sort((l, r) => (l[0] > r[0] ? 1 : -1))
			)
	:	data

const jsonSchemaArrayUniqueItemsValidator = (
	array: readonly unknown[],
	ctx: Traversal
) => {
	const seen: Record<string, true> = {}
	const duplicates: unknown[] = []
	for (const item of array) {
		const stringified = JSON.stringify(deepNormalize(item))
		if (stringified in seen) duplicates.push(item)
		else seen[stringified] = true
	}
	return duplicates.length === 0 ?
			true
		:	ctx.reject({
				expected: "an array of unique items",
				actual: `an array with ${duplicates.length} duplicates: ${describeBranches(
					duplicates.map(duplicate => printable(duplicate)),
					{ finalDelimiter: ", and " }
				)}`
			})
}

const arrayContainsItemMatchingSchema = (schema: Type) => {
	const jsonSchemaArrayContainsValidator = (
		array: readonly unknown[],
		ctx: Traversal
	) =>
		array.some(item => schema.allows(item)) === true ?
			true
		:	ctx.reject({
				expected: `at least one item satisfying 'contains' schema of ${schema.description}`,
				actual: printable(array)
			})

	return jsonSchemaArrayContainsValidator
}

export const parseArrayJsonSchema: Type<
	(In: JsonSchema.Array) => Out<Type<unknown[], {}>>,
	any
> = JsonSchemaScope.ArraySchema.pipe(jsonSchema => {
	const arktypeArraySchema: Intersection.Schema<Array<unknown>> = {
		proto: "Array"
	}

	let itemsIsPrefixItems = false
	let itemsHaveBeenPreProcessed = false

	if ("prefixItems" in jsonSchema) {
		if ("items" in jsonSchema) {
			if ("additionalItems" in jsonSchema) {
				throwParseError(
					writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage()
				)
			}
			if (Array.isArray(jsonSchema.items)) {
				arktypeArraySchema.sequence = {
					prefix: [...jsonSchema.prefixItems, ...jsonSchema.items].map(
						item => jsonSchemaToType(item as never).internal
					)
				}
				itemsHaveBeenPreProcessed = true
			} else {
				jsonSchema.additionalItems = jsonSchema.items
				jsonSchema.items = jsonSchema.prefixItems
				itemsIsPrefixItems = true
			}
		} else {
			jsonSchema.items = jsonSchema.prefixItems
			itemsIsPrefixItems = true
		}
	}

	if (!itemsHaveBeenPreProcessed && "items" in jsonSchema) {
		if (Array.isArray(jsonSchema.items)) {
			arktypeArraySchema.sequence = {
				prefix: jsonSchema.items.map(
					item => jsonSchemaToType(item as never).internal
				)
			}

			if ("additionalItems" in jsonSchema) {
				if (jsonSchema.additionalItems !== false) {
					arktypeArraySchema.sequence = {
						...arktypeArraySchema.sequence,
						variadic: jsonSchemaToType(jsonSchema.additionalItems as never)
							.internal
					}
				}
			} else if (itemsIsPrefixItems) {
				arktypeArraySchema.sequence = {
					...arktypeArraySchema.sequence,
					variadic: type.unknown.internal
				}
			}
		} else {
			if ("additionalItems" in jsonSchema) {
				throwParseError(
					writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage()
				)
			}
			arktypeArraySchema.sequence = {
				variadic: jsonSchemaToType(jsonSchema.items as never).internal
			}
		}
	} else if ("additionalItems" in jsonSchema) {
		arktypeArraySchema.sequence = {
			variadic: jsonSchemaToType(jsonSchema.additionalItems as never).internal
		}
	}

	if ("maxItems" in jsonSchema)
		arktypeArraySchema.maxLength = jsonSchema.maxItems
	if ("minItems" in jsonSchema)
		arktypeArraySchema.minLength = jsonSchema.minItems

	const predicates: Predicate.Schema[] = []
	if ("uniqueItems" in jsonSchema && jsonSchema.uniqueItems === true)
		predicates.push(jsonSchemaArrayUniqueItemsValidator)

	if ("contains" in jsonSchema) {
		const parsedContainsJsonSchema = jsonSchemaToType(
			jsonSchema.contains as never
		)
		predicates.push(arrayContainsItemMatchingSchema(parsedContainsJsonSchema))
	}

	if (predicates.length > 0) arktypeArraySchema.predicate = predicates

	return rootSchema(arktypeArraySchema) as never
})

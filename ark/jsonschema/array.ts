import {
	rootSchema,
	type Intersection,
	type Predicate,
	type Traversal
} from "@ark/schema"
import { printable, throwParseError } from "@ark/util"
import { type, type JsonSchema, type Out, type Type } from "arktype"
import { parseJsonSchema } from "./json.ts"
import { JsonSchemaScope } from "./scope.ts"

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
				expected: "unique array items",
				actual: `duplicated at elements ${printable(duplicates)}`
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
	if ("prefixItems" in jsonSchema) {
		if ("items" in jsonSchema) {
			if ("additionalItems" in jsonSchema) {
				throwParseError(
					"Provided array JSON Schema cannot have 'additionalItems' and 'items' and 'prefixItems'"
				)
			} else jsonSchema.additionalItems = jsonSchema.items
		}
		jsonSchema.items = jsonSchema.prefixItems
		itemsIsPrefixItems = true
	}

	if ("items" in jsonSchema) {
		if (Array.isArray(jsonSchema.items)) {
			arktypeArraySchema.sequence = {
				prefix: jsonSchema.items.map(item => parseJsonSchema(item).internal)
			}

			if ("additionalItems" in jsonSchema) {
				if (jsonSchema.additionalItems !== false) {
					arktypeArraySchema.sequence = {
						...arktypeArraySchema.sequence,
						variadic: parseJsonSchema(jsonSchema.additionalItems).internal
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
					"Provided array JSON Schema cannot have non-array 'items' and 'additionalItems"
				)
			}
			arktypeArraySchema.sequence = {
				variadic: parseJsonSchema(jsonSchema.items).internal
			}
		}
	} else if ("additionalItems" in jsonSchema) {
		arktypeArraySchema.sequence = {
			variadic: parseJsonSchema(jsonSchema.additionalItems).internal
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
		const parsedContainsJsonSchema = parseJsonSchema(jsonSchema.contains)
		predicates.push(arrayContainsItemMatchingSchema(parsedContainsJsonSchema))
	}

	arktypeArraySchema.predicate = predicates

	return rootSchema(arktypeArraySchema) as never
})

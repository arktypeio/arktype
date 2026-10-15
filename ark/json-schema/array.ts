import {
	describeBranches,
	node,
	type Intersection,
	type mutableInnerOfKind,
	type Predicate,
	type Traversal
} from "@ark/schema"
import { printable, throwParseError } from "@ark/util"
import { type, type JsonSchema, type Out, type Type } from "arktype"
import {
	writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage,
	writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage
} from "./errors.ts"
import { jsonSchemaToType } from "./json.ts"
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
	const arktypeArraySchema: Intersection.Inner = {
		proto: node("proto", { proto: Array })
	}
	let sequence: mutableInnerOfKind<"sequence"> | undefined

	let itemsIsPrefixItems = false
	if ("prefixItems" in jsonSchema) {
		if ("items" in jsonSchema) {
			if ("additionalItems" in jsonSchema) {
				throwParseError(
					writeJsonSchemaArrayAdditionalItemsAndItemsAndPrefixItemsMessage()
				)
			} else jsonSchema.additionalItems = jsonSchema.items
		}
		jsonSchema.items = jsonSchema.prefixItems
		itemsIsPrefixItems = true
	}

	if ("items" in jsonSchema) {
		if (Array.isArray(jsonSchema.items)) {
			sequence = {
				prefix: jsonSchema.items.map(item => jsonSchemaToType(item).internal)
			}

			if ("additionalItems" in jsonSchema) {
				if (jsonSchema.additionalItems !== false) {
					sequence.variadic = jsonSchemaToType(
						jsonSchema.additionalItems
					).internal
				}
			} else if (itemsIsPrefixItems) sequence.variadic = type.unknown.internal
		} else {
			if ("additionalItems" in jsonSchema) {
				throwParseError(
					writeJsonSchemaArrayNonArrayItemsAndAdditionalItemsMessage()
				)
			}
			sequence = {
				variadic: jsonSchemaToType(jsonSchema.items).internal
			}
		}
	} else if ("additionalItems" in jsonSchema) {
		sequence = {
			variadic: jsonSchemaToType(jsonSchema.additionalItems).internal
		}
	}

	if (sequence) {
		arktypeArraySchema.structure = node("structure", {
			sequence: node("sequence", sequence)
		})
	}

	if ("maxItems" in jsonSchema) {
		arktypeArraySchema.maxLength = node("maxLength", {
			rule: jsonSchema.maxItems
		}) as never
	}
	if ("minItems" in jsonSchema) {
		const minLength = node("minLength", { rule: jsonSchema.minItems })
		// a minimum length of 0 reduces to unknown
		if (minLength.hasKind("minLength")) arktypeArraySchema.minLength = minLength
	}

	const predicates: Predicate[] = []
	if ("uniqueItems" in jsonSchema && jsonSchema.uniqueItems === true)
		predicates.push(jsonSchemaArrayUniqueItemsValidator)

	if ("contains" in jsonSchema) {
		const parsedContainsJsonSchema = jsonSchemaToType(jsonSchema.contains)
		predicates.push(arrayContainsItemMatchingSchema(parsedContainsJsonSchema))
	}

	if (predicates.length > 0) {
		arktypeArraySchema.predicate = predicates.map(predicate =>
			node("predicate", { predicate })
		)
	}

	// an unconstrained array is its proto
	return (
		Object.keys(arktypeArraySchema).length === 1 ?
			arktypeArraySchema.proto
		:	node("intersection", arktypeArraySchema)) as never
})

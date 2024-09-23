import {
	rootSchema,
	type Intersection,
	type Predicate,
	type TraversalContext
} from "@ark/schema"
import { printable, type array } from "@ark/util"
import type { Type, applyConstraint, schemaToConstraint } from "arktype"

import { innerParseJsonSchema, type inferJsonSchema } from "./json.js"
import { JsonSchema } from "./scope.js"

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

const arrayItemsAreUnique = (
	array: readonly unknown[],
	ctx: TraversalContext
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

const arrayContainsItemMatchingSchema = (
	array: readonly unknown[],
	schema: Type<unknown>,
	ctx: TraversalContext
) =>
	array.some(item => schema.allows(item)) === true ?
		true
	:	ctx.mustBe(
			"an array containing at least one item matching 'contains' schema"
		)

export const validateJsonSchemaArray = JsonSchema.ArraySchema.pipe(
	jsonSchema => {
		const arktypeArraySchema: Intersection.Schema<Array<unknown>> = {
			proto: "Array"
		}

		if ("items" in jsonSchema) {
			if (Array.isArray(jsonSchema.items)) {
				arktypeArraySchema.sequence = {
					prefix: jsonSchema.items.map(
						item => innerParseJsonSchema.assert(item).internal
					)
				}

				if ("additionalItems" in jsonSchema) {
					if (jsonSchema.additionalItems === false)
						arktypeArraySchema.exactLength = jsonSchema.items.length
					else {
						arktypeArraySchema.sequence = {
							...arktypeArraySchema.sequence,
							variadic: innerParseJsonSchema.assert(jsonSchema.additionalItems)
								.internal
						}
					}
				}
			} else {
				arktypeArraySchema.sequence = {
					variadic: innerParseJsonSchema.assert(jsonSchema.items).internal
				}
			}
		}

		if ("maxItems" in jsonSchema)
			arktypeArraySchema.maxLength = jsonSchema.maxItems
		if ("minItems" in jsonSchema)
			arktypeArraySchema.minLength = jsonSchema.minItems

		const predicates: Predicate.Schema[] = []
		if ("uniqueItems" in jsonSchema && jsonSchema.uniqueItems === true)
			predicates.push((arr: unknown[], ctx) => arrayItemsAreUnique(arr, ctx))

		if ("contains" in jsonSchema) {
			const parsedContainsJsonSchema = innerParseJsonSchema.assert(
				jsonSchema.contains
			)
			predicates.push((arr: unknown[], ctx) =>
				arrayContainsItemMatchingSchema(arr, parsedContainsJsonSchema, ctx)
			)
		}

		arktypeArraySchema.predicate = predicates

		return rootSchema(arktypeArraySchema) as unknown as Type<JsonSchema.Json[]>
	}
)

type inferArrayOfJsonSchema<tuple extends array<JsonSchema.Schema>> = {
	[index in keyof tuple]: inferJsonSchema<tuple[index]>
}

export type inferJsonSchemaArray<arraySchema, T = unknown> =
	"additionalItems" extends keyof arraySchema ?
		"items" extends keyof arraySchema ?
			arraySchema["items"] extends array<JsonSchema.Schema> ?
				inferJsonSchemaArrayConstraints<
					Omit<arraySchema, "additionalItems" | "items">,
					[
						...inferJsonSchemaArrayItems<arraySchema["items"]>,
						...inferJsonSchema<arraySchema["additionalItems"]>[]
					]
				>
			:	// JSON Schema spec explicitly says that additionalItems MUST be ignored if items is not an array, and it's NOT an error
				inferJsonSchemaArray<Omit<arraySchema, "additionalItems">, T>
		:	inferJsonSchema<arraySchema["additionalItems"]>
	: "items" extends keyof arraySchema ?
		inferJsonSchemaArray<
			Omit<arraySchema, "items">,
			T & inferJsonSchemaArrayItems<arraySchema["items"]>
		>
	:	inferJsonSchemaArrayConstraints<arraySchema, T extends array ? T : T[]>

type inferJsonSchemaArrayConstraints<arraySchema, T> =
	"maxItems" extends keyof arraySchema ?
		inferJsonSchemaArrayConstraints<
			Omit<arraySchema, "maxItems">,
			applyConstraint<
				T,
				schemaToConstraint<"maxLength", arraySchema["maxItems"] & number>
			>
		>
	: "minItems" extends keyof arraySchema ?
		inferJsonSchemaArrayConstraints<
			Omit<arraySchema, "minItems">,
			applyConstraint<
				T,
				schemaToConstraint<"minLength", arraySchema["minItems"] & number>
			>
		>
	: T extends {} ? T
	: never

type inferJsonSchemaArrayItems<arrayItemsSchema> =
	arrayItemsSchema extends array ?
		arrayItemsSchema["length"] extends 0 ?
			// JSON Schema explicitly states that {items: []} means "an array of anything"
			// https://json-schema.org/understanding-json-schema/reference/array#items
			unknown[]
		: arrayItemsSchema extends array<JsonSchema.Schema> ?
			inferArrayOfJsonSchema<arrayItemsSchema>
		:	never
	:	inferJsonSchema<arrayItemsSchema>[]

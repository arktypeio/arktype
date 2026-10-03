import {
	$ark,
	mergeToJsonSchemaConfigs,
	type BaseRoot,
	type ConstraintKind,
	type JsonSchema,
	type RefinementKind,
	type RootKind,
	type Sequence,
	type Structure,
	type ToJsonSchema,
	type nodeOfKind
} from "@ark/schema"
import { flatMorph, hasKey, printable, throwInternalError } from "@ark/util"

interface JsonSchemaContext extends ToJsonSchema.Context {
	refs: BaseRoot[]
}

export const toJsonSchema = (
	node: BaseRoot,
	opts: ToJsonSchema.Options
): JsonSchema => {
	const ctx: JsonSchemaContext = Object.assign(
		mergeToJsonSchemaConfigs(node.$.resolvedConfig.toJsonSchema, opts),
		{ refs: [] }
	)

	ctx.useRefs ||= node.isCyclic

	// ensure $schema is the first key if present
	const schema: JsonSchema =
		typeof ctx.dialect === "string" ? { $schema: ctx.dialect } : {}

	Object.assign(schema, toJsonSchemaRecurse(node, ctx))

	if (ctx.useRefs) {
		const schemasById: Record<string, JsonSchema> = {}
		for (let i = 0; i < ctx.refs.length; i++)
			schemasById[ctx.refs[i].id] ??= toResolvedJsonSchema(ctx.refs[i], ctx)
		// only nodes a $ref reaches are defined, so a discriminant's cases aren't
		const defs = flatMorph(node.references, (i, ref) =>
			ref.id in schemasById ? [ref.id, schemasById[ref.id]] : []
		)
		// an alias's resolution or a morph's out can be reached outside
		// node.references
		Object.assign(defs, schemasById)
		// draft-2020-12 uses $defs, draft-07 uses definitions
		if (ctx.target === "draft-07") Object.assign(schema, { definitions: defs })
		else schema.$defs = defs
	}

	return schema
}

export const toJsonSchemaRecurse = (
	node: BaseRoot,
	ctx: JsonSchemaContext
): JsonSchema => {
	if (ctx.useRefs && !alwaysExpandJsonSchema(node)) {
		ctx.refs.push(node)
		// draft-2020-12 uses $defs, draft-07 uses definitions
		const defsKey = ctx.target === "draft-07" ? "definitions" : "$defs"
		return { $ref: `#/${defsKey}/${node.id}` } as JsonSchema.Ref
	}

	return toResolvedJsonSchema(node, ctx)
}

export const alwaysExpandJsonSchema = (node: BaseRoot): boolean =>
	node.isBasis() ||
	node.kind === "alias" ||
	(node.hasKind("union") && node.isBoolean)

const toResolvedJsonSchema = (
	node: BaseRoot,
	ctx: JsonSchemaContext
): JsonSchema => {
	const result = innerToJsonSchemaByKind[node.kind](node as never, ctx)

	return Object.assign(result, node.metaJson)
}

const branchGroupsOf = (node: nodeOfKind<"union">): BaseRoot[] => {
	const branchGroups: BaseRoot[] = []
	let firstBooleanIndex = -1
	for (const branch of node.branches) {
		if (branch.hasKind("unit") && branch.domain === "boolean") {
			if (firstBooleanIndex === -1) {
				firstBooleanIndex = branchGroups.length
				branchGroups.push(branch)
			} else branchGroups[firstBooleanIndex] = $ark.intrinsic.boolean
			continue
		}
		branchGroups.push(branch)
	}
	return branchGroups
}

const innerToJsonSchemaByKind: {
	[kind in RootKind]: (
		node: nodeOfKind<kind>,
		ctx: JsonSchemaContext
	) => JsonSchema
} = {
	alias: (node, ctx) => toJsonSchemaRecurse(node.resolution, ctx),
	union: (node, ctx) => {
		const branchGroups = branchGroupsOf(node)
		// special case to simplify { const: true } | { const: false }
		// to the canonical JSON Schema representation { type: "boolean" }
		if (
			branchGroups.length === 1 &&
			branchGroups[0].equals($ark.intrinsic.boolean)
		)
			return { type: "boolean" }

		const jsonSchemaBranches = branchGroups.map(group =>
			toJsonSchemaRecurse(group, ctx)
		)

		if (
			jsonSchemaBranches.every(
				(branch): branch is JsonSchema.Const =>
					// iff all branches are pure unit values with no metadata,
					// we can simplify the representation to an enum
					Object.keys(branch).length === 1 && hasKey(branch, "const")
			)
		) {
			return {
				enum: jsonSchemaBranches.map(branch => branch.const)
			}
		}

		return {
			anyOf: jsonSchemaBranches
		}
	},
	morph: (node, ctx) =>
		ctx.fallback.morph({
			code: "morph",
			base: toJsonSchemaRecurse(node.rawIn, ctx),
			out:
				node.introspectableOut ?
					toJsonSchemaRecurse(node.introspectableOut, ctx)
				:	null
		}),
	unit: (node, ctx) =>
		// this is the more standard JSON schema representation, especially for Open API
		node.unit === null ? { type: "null" }
		: $ark.intrinsic.jsonPrimitive.allows(node.unit) ? { const: node.unit }
		: ctx.fallback.unit({ code: "unit", base: {}, unit: node.unit }),
	intersection: (node, ctx) =>
		node.children.reduce<JsonSchema>(
			// cast is required since TS doesn't know children have compatible schema prerequisites
			(schema, child) =>
				child.isBasis() ?
					toJsonSchemaRecurse(child, ctx)
				:	reduceJsonSchemaByKind[child.kind](
						child as never,
						schema as never,
						ctx
					),
			{}
		),
	proto: (node, ctx) => {
		switch (node.builtinName) {
			case "Array":
				return {
					type: "array"
				}
			case "Date":
				return (
					ctx.fallback.date?.({ code: "date", base: {} }) ??
					ctx.fallback.proto({ code: "proto", base: {}, proto: node.proto })
				)
			default:
				return ctx.fallback.proto({
					code: "proto",
					base: {},
					proto: node.proto
				})
		}
	},
	domain: (node, ctx): JsonSchema.Constrainable => {
		if (node.domain === "bigint" || node.domain === "symbol") {
			return ctx.fallback.domain({
				code: "domain",
				base: {},
				domain: node.domain
			})
		}
		return {
			type: node.domain
		}
	}
}

const reduceObjectJsonSchema = (
	node: Structure.Node,
	schema: JsonSchema.Object,
	ctx: JsonSchemaContext
): JsonSchema.Object => {
	if (node.props.length) {
		schema.properties = {}
		for (const prop of node.props) {
			const valueSchema = toJsonSchemaRecurse(prop.value, ctx)

			if (typeof prop.key === "symbol") {
				ctx.fallback.symbolKey({
					code: "symbolKey",
					base: schema,
					key: prop.key,
					value: valueSchema,
					optional: prop.optional
				})
				continue
			}

			if (prop.hasDefault()) {
				const value =
					typeof prop.default === "function" ? prop.default() : prop.default
				valueSchema.default =
					$ark.intrinsic.jsonData.allows(value) ?
						value
					:	ctx.fallback.defaultValue({
							code: "defaultValue",
							base: valueSchema,
							value
						})
			}

			schema.properties![prop.key] = valueSchema
		}
		if (node.requiredKeys.length && schema.properties) {
			schema.required = node.requiredKeys.filter(
				(k): k is string => typeof k === "string" && k in schema.properties!
			)
		}
	}

	if (node.index) {
		for (const index of node.index) {
			const valueJsonSchema = toJsonSchemaRecurse(index.value, ctx)

			if (index.signature.equals($ark.intrinsic.string)) {
				schema.additionalProperties = valueJsonSchema
				continue
			}

			for (const keyBranch of index.signature.branches) {
				if (!keyBranch.extends($ark.intrinsic.string)) {
					schema = ctx.fallback.symbolKey({
						code: "symbolKey",
						base: schema,
						key: null,
						value: valueJsonSchema,
						optional: false
					})

					continue
				}

				let keySchema: JsonSchema.String = { type: "string" }
				if (keyBranch.hasKind("morph")) {
					// a key's schema can't be a $ref
					keySchema = ctx.fallback.morph({
						code: "morph",
						base: toResolvedJsonSchema(keyBranch.rawIn, ctx),
						out: toResolvedJsonSchema(keyBranch.rawOut, ctx)
					}) as never
					if (keySchema.pattern) {
						schema.patternProperties ??= {}
						schema.patternProperties[keySchema.pattern] = valueJsonSchema
					} else if (
						keySchema.type === "string" &&
						Object.keys(keySchema).length === 1
					)
						schema.additionalProperties = valueJsonSchema
					continue
				}
				if (!keyBranch.hasKind("intersection")) {
					return throwInternalError(
						`Unexpected index branch kind ${keyBranch.kind}.`
					)
				}

				const { pattern } = keyBranch.inner

				if (pattern) {
					const keySchemaWithPattern = Object.assign(keySchema, {
						pattern: pattern[0].rule
					})

					for (let i = 1; i < pattern.length; i++) {
						keySchema = ctx.fallback.patternIntersection({
							code: "patternIntersection",
							base: keySchemaWithPattern,
							pattern: pattern[i].rule
						})
					}

					schema.patternProperties ??= {}
					schema.patternProperties[keySchemaWithPattern.pattern] =
						valueJsonSchema
				}
			}
		}
	}

	if (node.undeclared && !schema.additionalProperties)
		schema.additionalProperties = false

	return schema
}

const reduceSequenceJsonSchema = (
	node: Sequence.Node,
	schema: JsonSchema.Array,
	ctx: JsonSchemaContext
): JsonSchema.Array => {
	const isDraft07 = ctx.target === "draft-07"

	if (node.prevariadic.length) {
		const prefixSchemas = node.prevariadic.map(el => {
			const valueSchema = toJsonSchemaRecurse(el.node, ctx)
			if (el.kind === "defaultables") {
				const value =
					typeof el.default === "function" ? el.default() : el.default
				valueSchema.default =
					$ark.intrinsic.jsonData.allows(value) ?
						value
					:	ctx.fallback.defaultValue({
							code: "defaultValue",
							base: valueSchema,
							value
						})
			}
			return valueSchema
		})

		// draft-07 uses items as array, draft-2020-12 uses prefixItems
		if (isDraft07) schema.items = prefixSchemas as JsonSchema.Branch[]
		else schema.prefixItems = prefixSchemas
	}

	// by default JSON schema prefixElements are optional
	// add minLength here if there are any required prefix elements
	if (node.minLength) schema.minItems = node.minLength

	if (node.variadic) {
		const variadicItemSchema = toJsonSchemaRecurse(node.variadic, ctx)

		// draft-07 uses additionalItems when items is an array (tuple),
		// draft-2020-12 uses items
		if (isDraft07 && node.prevariadic.length)
			schema.additionalItems = variadicItemSchema
		else schema.items = variadicItemSchema

		// maxLength constraint will be enforced by items: false
		// for non-variadic arrays
		if (node.maxLength) schema.maxItems = node.maxLength

		// postfix can only be present if variadic is present so nesting this is fine
		if (node.postfix) {
			const elements = node.postfix.map(el => toJsonSchemaRecurse(el, ctx))
			schema = ctx.fallback.arrayPostfix({
				code: "arrayPostfix",
				base: schema as ToJsonSchema.VariadicArraySchema,
				elements
			})
		}
	} else {
		// For fixed-length tuples without variadic elements
		// draft-07 uses additionalItems: false, draft-2020-12 uses items: false
		if (isDraft07) schema.additionalItems = false
		else schema.items = false
		// delete maxItems constraint that will have been added by the
		// base intersection node to enforce fixed length
		delete schema.maxItems
	}

	return schema
}

type JsonSchemaOperandByKind = {
	pattern: JsonSchema.String
	divisor: JsonSchema.Numeric
	exactLength: JsonSchema.LengthBoundable
	max: JsonSchema.Numeric
	min: JsonSchema.Numeric
	maxLength: JsonSchema.LengthBoundable
	minLength: JsonSchema.LengthBoundable
	before: JsonSchema
	after: JsonSchema
	structure: JsonSchema.Structure
	predicate: JsonSchema.Constrainable
}

const throwInternalOperandError = (
	kind: ConstraintKind,
	schema: JsonSchema
): never =>
	throwInternalError(
		`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
	)

const reduceJsonSchemaByKind: {
	[kind in RefinementKind]: (
		node: nodeOfKind<kind>,
		schema: JsonSchemaOperandByKind[kind],
		ctx: JsonSchemaContext
	) => JsonSchema
} = {
	pattern: (node, base, ctx) => {
		if (base.pattern) {
			return ctx.fallback.patternIntersection({
				code: "patternIntersection",
				base: base as ToJsonSchema.StringSchemaWithPattern,
				pattern: node.rule
			})
		}
		base.pattern = node.rule
		return base
	},
	divisor: (node, schema) => {
		schema.type = "integer"

		if (node.rule === 1) return schema

		schema.multipleOf = node.rule

		return schema
	},
	exactLength: (node, schema) => {
		switch (schema.type) {
			case "string":
				schema.minLength = node.rule
				schema.maxLength = node.rule
				return schema
			case "array":
				schema.minItems = node.rule
				schema.maxItems = node.rule
				return schema
			default:
				return throwInternalOperandError("exactLength", schema)
		}
	},
	max: (node, schema) => {
		if (node.exclusive) schema.exclusiveMaximum = node.rule
		else schema.maximum = node.rule
		return schema
	},
	min: (node, schema) => {
		if (node.exclusive) schema.exclusiveMinimum = node.rule
		else schema.minimum = node.rule
		return schema
	},
	maxLength: (node, schema) => {
		switch (schema.type) {
			case "string":
				schema.maxLength = node.rule
				return schema
			case "array":
				schema.maxItems = node.rule
				return schema
			default:
				return throwInternalOperandError("maxLength", schema)
		}
	},
	minLength: (node, schema) => {
		switch (schema.type) {
			case "string":
				schema.minLength = node.rule
				return schema
			case "array":
				schema.minItems = node.rule
				return schema
			default:
				return throwInternalOperandError("minLength", schema)
		}
	},
	before: (node, base, ctx) =>
		ctx.fallback.date({ code: "date", base, before: node.rule }),
	after: (node, base, ctx) =>
		ctx.fallback.date({ code: "date", base, after: node.rule }),
	structure: (node, schema, ctx) => {
		switch (schema.type) {
			case "object":
				return reduceObjectJsonSchema(node, schema, ctx)
			case "array":
				const arraySchema =
					node.sequence ?
						reduceSequenceJsonSchema(node.sequence, schema, ctx)
					:	schema
				if (node.props.length || node.index) {
					return ctx.fallback.arrayObject({
						code: "arrayObject",
						base: arraySchema,
						object: reduceObjectJsonSchema(node, { type: "object" }, ctx)
					})
				}

				return arraySchema

			default:
				return throwInternalOperandError("structure", schema)
		}
	},
	predicate: (node, base, ctx) =>
		ctx.fallback.predicate({
			code: "predicate",
			base,
			predicate: node.predicate
		})
}

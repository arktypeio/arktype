import {
	$ark,
	mergeToJsonSchemaConfigs,
	ToJsonSchema,
	type Alias,
	type BaseRoot,
	type JsonSchema,
	type Prop,
	type RefinementKind,
	type RootKind,
	type Sequence,
	type Structure,
	type Union,
	type nodeOfKind
} from "@ark/schema"
import {
	appendStringifiedKey,
	flatMorph,
	hasKey,
	isEmptyObject,
	type dict
} from "@ark/util"

// JSON Schema's object type, which excludes what an Array basis allows
export const isNonArray = (data: object): boolean => !Array.isArray(data)

interface JsonSchemaContext extends ToJsonSchema.Context {
	/** where in the Type the node being converted is, for its errors */
	path: string
	/** the ids of the nodes being converted, so one reached again is a cycle */
	open: string[]
	defNamesById: Record<string, string>
	defs: Record<string, JsonSchema | undefined>
}

export const rootToJsonSchema = (
	node: BaseRoot,
	opts: ToJsonSchema.Options
): JsonSchema => {
	const ctx: JsonSchemaContext = Object.assign(
		mergeToJsonSchemaConfigs(node.$.cfg.toJsonSchema, opts),
		{ path: "", open: [], defNamesById: {}, defs: {} }
	)
	// a default handler throws naming where the part it can't convert is
	ctx.fallback = flatMorph(ctx.fallback, (code, handler) => [
		code,
		handler === ToJsonSchema.defaultConfig.fallback[code] ?
			(fallbackCtx: never) => ToJsonSchema.throw(code, fallbackCtx, ctx.path)
		:	handler
	]) as ToJsonSchema.HandlerByCode

	// ensure $schema is the first key if present
	const schema: JsonSchema = Object.assign(
		typeof ctx.dialect === "string" ? { $schema: ctx.dialect } : {},
		toJsonSchemaRecurse(node, ctx)
	)

	if (isEmptyObject(ctx.defs)) return schema
	const defs = ctx.defs as Record<string, JsonSchema>
	// draft-2020-12 uses $defs, draft-07 uses definitions
	if (ctx.target === "draft-07") Object.assign(schema, { definitions: defs })
	else if (ctx.target === "draft-2020-12") schema.$defs = defs
	else {
		// an OpenAPI document's components hold what a Schema Object can't
		ctx.path = ""
		return ctx.fallback.defs({ code: "defs", base: schema, defs })
	}
	return schema
}

const refPrefixByTarget: Record<ToJsonSchema.Target, string> = {
	"draft-2020-12": "#/$defs/",
	"draft-07": "#/definitions/",
	"openapi-3.0": "#/components/schemas/"
}

export const toJsonSchemaRecurse = (
	node: BaseRoot,
	ctx: JsonSchemaContext
): JsonSchema => {
	// a cyclic alias's resolution is written once, named by the alias
	if (node.is("alias")) {
		const name = aliasNameOf(node)
		if (name !== undefined) nameDef(node.resolution, name, ctx)
		return toJsonSchemaRecurse(node.resolution, ctx)
	}
	const i = ctx.open.lastIndexOf(node.id)
	// a cycle through no def would be converted forever, so it's named by its
	// id, like useRefs' parts
	if (
		(i !== -1 && ctx.open.slice(i).every(id => !(id in ctx.defNamesById))) ||
		(ctx.useRefs && !node.alwaysExpandJsonSchema)
	)
		nameDef(node, nameOfId(node.id), ctx)
	const name = ctx.defNamesById[node.id]
	if (name !== undefined && (i !== -1 || ctx.defs[name]))
		return refTo(name, ctx)
	ctx.open.push(node.id)
	const schema = toResolvedJsonSchema(node, ctx)
	ctx.open.pop()
	// reaching it again while it was converted can have named it
	const defName = ctx.defNamesById[node.id]
	if (defName === undefined) return schema
	ctx.defs[defName] = schema
	return refTo(defName, ctx)
}

const refTo = (name: string, ctx: JsonSchemaContext): JsonSchema.Ref =>
	({ $ref: refPrefixByTarget[ctx.target] + name }) as JsonSchema.Ref

// the alias a cyclic definition's id starts with, without the count after it
const nameOfId = (id: string): string => id.replace(/(?<=\d)_\d+$|\d+$/, "")

// an input or output is named by the alias it was read from, and an alias of
// an anonymous value, like a union holding an alias, names nothing
const aliasNameOf = (node: Alias.Node): string | undefined =>
	node.isIo ? aliasNameOf(node.operands![0] as Alias.Node)
	: node.reference === node.resolution.id ? nameOfId(node.reference)
	: undefined

const nameDef = (
	node: BaseRoot,
	name: string,
	ctx: JsonSchemaContext
): void => {
	if (node.id in ctx.defNamesById) return
	let unique = name
	for (let i = 2; unique in ctx.defs; i++) unique = `${name}${i}`
	// reserved, so $defs are in the order they're named
	ctx.defs[unique] = undefined
	ctx.defNamesById[node.id] = unique
}

const toResolvedJsonSchema = (
	node: BaseRoot,
	ctx: JsonSchemaContext
): JsonSchema => {
	const { jsonSchema } = node.meta
	const result: JsonSchema & dict =
		jsonSchema ?
			{}
		:	(innerToJsonSchemaByKind[node.kind](node as never, ctx) as never)

	for (const k in node.meta) {
		// keyword identifies arktype's own phrase, which JSON Schema has no key for
		if (k === "keyword" || k === "jsonSchema") continue
		const v = (node.meta as dict)[k]
		// JSON can't represent a function like a message writer
		if (typeof v === "function" && k !== "default") continue
		// metaJson serializes non-primitives like [5] to references like
		// "$ark.array1", so prefer the original value when it is valid JSON
		// (jsonData's object domain also allows functions, so exclude them)
		const jsonValue =
			typeof v !== "function" && $ark.intrinsic.jsonData.allows(v) ? v
			: k === "default" ?
				ctx.fallback.defaultValue({
					code: "defaultValue",
					base: result,
					value: v as never
				})
			:	(node.metaJson as dict)[k]
		if (jsonValue !== undefined) writeAnnotation(result, k, jsonValue, ctx)
	}

	return jsonSchema ? Object.assign(result, jsonSchema) : result
}

const branchGroupsToJsonSchema = (
	node: Union.Node,
	branchGroups: BaseRoot[],
	ctx: JsonSchemaContext
): JsonSchema => {
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
	// what's left of a union without its null
	if (jsonSchemaBranches.length === 1) return jsonSchemaBranches[0]

	// openapi-3.0 writes a unit as an enum
	const unitKey = ctx.target === "openapi-3.0" ? "enum" : "const"
	if (
		jsonSchemaBranches.every(
			(branch): branch is UnitJsonSchema =>
				// iff all branches are pure unit values with no metadata other than
				// the union's own, we can simplify the representation to an enum
				Object.entries(branch).every(
					([k, v]) =>
						k === unitKey ||
						k === "type" ||
						v === (node.meta as dict)[k] ||
						v === (node.metaJson as dict)[k]
				) && hasKey(branch, unitKey)
		)
	) {
		const values = jsonSchemaBranches.flatMap(branch =>
			unitKey === "enum" ? branch.enum : [branch.const]
		)
		// never has no branches
		const type = jsonSchemaBranches[0]?.type
		return type && jsonSchemaBranches.every(branch => branch.type === type) ?
				{ type, enum: values }
			:	{ enum: values }
	}

	return {
		anyOf: jsonSchemaBranches
	}
}

type UnitJsonSchema = JsonSchema.Const &
	JsonSchema.Enum &
	JsonSchema.Constrainable

// OpenAPI 3.0 has no null type, and nullable only adds null to a type beside it
const openApiNull = (): JsonSchema =>
	({ type: "string", nullable: true, enum: [null] }) as JsonSchema

const writeAnnotation = (
	schema: object,
	k: string,
	v: unknown,
	ctx: JsonSchemaContext
): void => {
	const annotations = schema as dict
	if (ctx.target !== "openapi-3.0") annotations[k] = v
	// OpenAPI 3.0 has a single example
	else if (k === "examples") {
		if ((v as unknown[]).length) annotations.example = (v as unknown[])[0]
	}
	// OpenAPI 3.0 has no contentEncoding, but names base64 with a format
	else if (k === "contentEncoding") {
		if (v === "base64") annotations.format = "byte"
	} else annotations[k] = v
}

// a union's true and false branches are written as one boolean
const branchGroupsOf = (node: Union.Node): BaseRoot[] => {
	const branchGroups: BaseRoot[] = []
	let firstBooleanIndex = -1
	for (const branch of node.branches) {
		if (branch.is("unit") && branch.domain === "boolean") {
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
		const nonNull = branchGroups.filter(branch => !branch.hasUnit(null))
		if (nonNull.length === branchGroups.length)
			return branchGroupsToJsonSchema(node, branchGroups, ctx)
		// null is written beside the rest, so their values still share a type
		const schema = branchGroupsToJsonSchema(node, nonNull, ctx)
		// nullable adds null to the type beside it, so an enum must list it
		if (
			ctx.target === "openapi-3.0" &&
			typeof (schema as JsonSchema.Constrainable).type === "string"
		) {
			return Object.assign(
				schema,
				{ nullable: true },
				"enum" in schema && {
					enum: [...(schema as JsonSchema.Enum).enum, null]
				}
			)
		}
		return {
			anyOf: [
				...(nonNull.length > 1 && "anyOf" in schema ?
					(schema as JsonSchema.Union).anyOf
				:	[schema]),
				ctx.target === "openapi-3.0" ? openApiNull() : { type: "null" }
			]
		}
	},
	morph: (node, ctx) =>
		ctx.io === "in" ?
			// its input as written, since _in drops the defaults it holds
			toJsonSchemaRecurse(
				node.declaredIn ?? node.head ?? $ark.intrinsic.unknown.internal,
				ctx
			)
		:	ctx.fallback.morph({
				code: "morph",
				base: toJsonSchemaRecurse(node._in, ctx),
				out: node.tail ? toJsonSchemaRecurse(node.tail._out, ctx) : null
			}),
	unit: (node, ctx) =>
		// this is the more standard JSON schema representation, especially for Open API
		node.unit === null ?
			ctx.target === "openapi-3.0" ?
				openApiNull()
			:	{ type: "null" }
		: !$ark.intrinsic.jsonPrimitive.allows(node.unit) ?
			ctx.fallback.unit({ code: "unit", base: {}, unit: node.unit })
		: ctx.target === "openapi-3.0" ?
			{ type: typeof node.unit as JsonSchema.TypeName, enum: [node.unit] }
		:	{ type: typeof node.unit as JsonSchema.TypeName, const: node.unit },
	intersection: (node, ctx) =>
		node.children.reduce<JsonSchema>(
			// cast is required since TS doesn't know children have compatible schema prerequisites
			(schema, child) =>
				child.isBasis() ? toJsonSchemaRecurse(child, ctx)
				: child.meta.jsonSchema ? Object.assign(schema, child.meta.jsonSchema)
				: reduceJsonSchemaByKind[child.kind](
						child as never,
						schema as never,
						ctx
					),
			{}
		),
	proto: (node, ctx) => {
		switch (node.builtinName) {
			case "Array":
				return arraySchemaOf(ctx)
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
	domain: (node, ctx): JsonSchema.Constrainable | JsonSchema.Object => {
		if (node.domain === "bigint" || node.domain === "symbol") {
			return ctx.fallback.domain({
				code: "domain",
				base: {},
				domain: node.domain
			})
		}
		// an object declaring no keys has no properties, as Zod writes it
		return node.domain === "object" ?
				{ type: "object", properties: {} }
			:	{ type: node.domain }
	}
}

const reduceObjectJsonSchema = (
	node: Structure.Node,
	schema: JsonSchema.Object,
	ctx: JsonSchemaContext
): JsonSchema.Object => {
	const path = ctx.path
	// keys an index declares are written as its patterns instead
	if (node.index && !node.props.length) delete schema.properties
	if (node.props.length) {
		schema.properties = {}
		for (const prop of node.props) {
			ctx.path = appendStringifiedKey(path, prop.key)
			const valueSchema = toJsonSchemaRecurse(jsonValueOf(prop), ctx)

			if (typeof prop.key === "symbol") {
				schema = ctx.fallback.symbolKey({
					code: "symbolKey",
					base: schema,
					key: prop.key,
					value: valueSchema,
					optional: prop.optional
				})
				continue
			}

			if (prop.hasDefault()) writeDefault(valueSchema, prop.default, ctx)

			schema.properties![prop.key] = valueSchema
		}
		ctx.path = path
		if (node.requiredKeys.length && schema.properties) {
			schema.required = node.requiredKeys.filter(
				(k): k is string => typeof k === "string" && k in schema.properties!
			)
		}
	}

	const indexKeys: IndexKey[] = []

	if (node.index) {
		for (const index of node.index) {
			ctx.path = `${path}[${index.signature.expression}]`
			const valueJsonSchema = toJsonSchemaRecurse(index.value, ctx)
			ctx.path = path

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

				let keyIn: BaseRoot = keyBranch
				let keySchema: JsonSchema.String | undefined
				if (keyBranch.is("morph")) {
					keyIn = keyBranch._in
					// a key's schema can't be a $ref
					if (ctx.io !== "in") {
						keySchema = ctx.fallback.morph({
							code: "morph",
							base: toResolvedJsonSchema(keyBranch._in, ctx),
							out:
								keyBranch.tail ?
									toResolvedJsonSchema(keyBranch.tail._out, ctx)
								:	null
						}) as never
					}
				}

				const pattern = keyPatternOf(keyIn, ctx)
				if (
					pattern !== undefined &&
					// OpenAPI 3.0 has no patternProperties, so only a string key
					// that will be written as additionalProperties
					(ctx.target !== "openapi-3.0" ||
						(pattern === "" && !node.props.length))
				) {
					;(schema.patternProperties ??= {})[pattern] = valueJsonSchema
					continue
				}

				indexKeys.push({
					node: keyIn,
					key: keySchema ?? (toResolvedJsonSchema(keyIn, ctx) as never),
					value: valueJsonSchema
				})
			}
		}
	}

	// an input may have the keys "delete" would remove
	const rejectsUndeclared =
		node.undeclared === "reject" ||
		(node.undeclared === "delete" && ctx.io !== "in")

	if (
		indexKeys.length === 1 &&
		rejectsUndeclared &&
		!schema.patternProperties &&
		ctx.target !== "openapi-3.0" &&
		node.props.every(
			prop => typeof prop.key === "symbol" || indexKeys[0].node.allows(prop.key)
		)
	) {
		// every key must match the index, so its value applies to each one
		// that isn't declared
		schema.propertyNames = indexKeys[0].key
		schema.additionalProperties = indexKeys[0].value
		return schema
	}

	if (
		schema.patternProperties?.[""] &&
		!schema.properties &&
		Object.keys(schema.patternProperties).length === 1
	) {
		// with no other keys or patterns, every key is an additional property
		schema.additionalProperties = schema.patternProperties[""]
		delete schema.patternProperties
	}

	if (rejectsUndeclared && !schema.additionalProperties)
		schema.additionalProperties = false

	for (const { key, value } of indexKeys) {
		schema = ctx.fallback.indexKey({
			code: "indexKey",
			base: schema,
			key,
			value
		})
	}

	return schema
}

// JSON has no undefined, so an optional key holds it only by being absent
const jsonValueOf = (prop: Prop.Node): BaseRoot =>
	(
		prop.optional &&
		prop.value.branches.some(branch => branch.hasUnit(undefined))
	) ?
		prop.value.$.schema(
			prop.value.branches.filter(branch => !branch.hasUnit(undefined))
		)
	:	prop.value

interface IndexKey {
	node: BaseRoot
	key: JsonSchema.String
	value: JsonSchema
}

// the pattern matching exactly the keys an index signature's key allows
const keyPatternOf = (
	key: BaseRoot,
	ctx: JsonSchemaContext
): string | undefined => {
	// declared keys are checked against an index signature too, which
	// additionalProperties would skip
	if (key.is("domain")) return ""
	if (!key.is("intersection") || key.refinements.length !== 1) return
	const [refinement] = key.refinements
	return refinement.is("pattern") && isJsonSchemaPattern(refinement, ctx) ?
			refinement.rule
		:	undefined
}

// d and g don't change what a pattern matches, and draft-2020-12 patterns
// should be built with u
const isJsonSchemaPattern = (
	node: nodeOfKind<"pattern">,
	ctx: JsonSchemaContext
): boolean =>
	!node.flags ||
	[...node.flags].every(
		flag =>
			flag === "d" ||
			flag === "g" ||
			(flag === "u" && ctx.target === "draft-2020-12")
	)

// a thunk's default is the value it returns
const writeDefault = (
	schema: JsonSchema,
	defaultInput: unknown,
	ctx: JsonSchemaContext
): void => {
	const value =
		typeof defaultInput === "function" ? defaultInput() : defaultInput
	const jsonDefault =
		$ark.intrinsic.jsonData.allows(value) ?
			value
		:	ctx.fallback.defaultValue({
				code: "defaultValue",
				base: schema,
				value
			})
	if (jsonDefault !== undefined) schema.default = jsonDefault
}

const reduceSequenceJsonSchema = (
	node: Sequence.Node,
	schema: JsonSchema.Array,
	ctx: JsonSchemaContext
): JsonSchema.Array => {
	const isDraft07 = ctx.target === "draft-07"
	const isOpenApi = ctx.target === "openapi-3.0"

	const path = ctx.path
	let prefixSchemas: JsonSchema[] | undefined
	if (node.leading.length) {
		prefixSchemas = node.leading.map((el, i) => {
			ctx.path = appendStringifiedKey(path, i)
			const valueSchema = toJsonSchemaRecurse(el.node, ctx)
			if (el.kind === "defaultables") writeDefault(valueSchema, el.default, ctx)
			return valueSchema
		})
		ctx.path = path

		// draft-07 uses items as array, draft-2020-12 uses prefixItems
		if (isDraft07) schema.items = prefixSchemas as JsonSchema.Branch[]
		else if (!isOpenApi) schema.prefixItems = prefixSchemas
	}

	// by default JSON schema prefixElements are optional
	// add minLength here if there are any required prefix elements
	if (node.minLength) schema.minItems = node.minLength

	if (node.variadic) {
		// a later element's index varies, so it's written as TS indexes it
		ctx.path = `${path}[number]`
		const variadicItemSchema = toJsonSchemaRecurse(node.variadic, ctx)
		const postfixSchemas = node.postfix?.map(el => toJsonSchemaRecurse(el, ctx))
		ctx.path = path

		// draft-07 uses additionalItems when items is an array (tuple),
		// draft-2020-12 uses items
		if (isDraft07 && node.leading.length)
			schema.additionalItems = variadicItemSchema
		else schema.items = variadicItemSchema

		// maxLength constraint will be enforced by items: false
		// for non-variadic arrays
		if (node.maxLength) schema.maxItems = node.maxLength

		// postfix can only be present if variadic is present so nesting this is fine
		if (postfixSchemas) {
			schema = ctx.fallback.arrayPostfix({
				code: "arrayPostfix",
				base: schema as ToJsonSchema.VariadicArraySchema,
				elements: postfixSchemas
			})
		}
	} else if (isOpenApi) schema.maxItems = node.maxLength!
	else {
		// For fixed-length tuples without variadic elements
		// draft-07 uses additionalItems: false, draft-2020-12 uses items: false
		if (isDraft07) schema.additionalItems = false
		else schema.items = false
		// delete maxItems constraint that will have been added by the
		// base intersection node to enforce fixed length
		delete schema.maxItems
	}

	// OpenAPI 3.0's items is one schema for every element, so it can't
	// express a prefix
	if (isOpenApi && prefixSchemas) {
		schema = ctx.fallback.arrayPrefix({
			code: "arrayPrefix",
			base: { ...schema, items: {} },
			elements: prefixSchemas,
			...(node.variadic &&
				schema.items && { items: schema.items as JsonSchema })
		})
	}

	return schema
}

// an OpenAPI 3.0 array schema must have items
const arraySchemaOf = (ctx: JsonSchemaContext): JsonSchema.Array =>
	ctx.target === "openapi-3.0" ?
		{ type: "array", items: {} }
	:	{ type: "array" }

const writeBound = (
	node: nodeOfKind<"min" | "max">,
	schema: JsonSchema.Numeric,
	ctx: JsonSchemaContext,
	key: "minimum" | "maximum",
	exclusiveKey: "exclusiveMinimum" | "exclusiveMaximum"
): JsonSchema.Numeric => {
	if (!node.exclusive) schema[key] = node.rule
	// openapi-3.0 marks the bound itself exclusive
	else if (ctx.target === "openapi-3.0") {
		schema[key] = node.rule
		schema[exclusiveKey] = true
	} else schema[exclusiveKey] = node.rule
	return schema
}

type JsonSchemaOperandByKind = {
	pattern: JsonSchema.String
	divisor: JsonSchema.Numeric
	exactLength: JsonSchema.LengthBoundable
	max: JsonSchema.Numeric
	min: JsonSchema.Numeric
	notEqual: JsonSchema.Numeric
	notEqualLength: JsonSchema.LengthBoundable
	maxLength: JsonSchema.LengthBoundable
	minLength: JsonSchema.LengthBoundable
	before: JsonSchema
	after: JsonSchema
	structure: JsonSchema.Structure
	predicate: JsonSchema.Constrainable
}

const reduceJsonSchemaByKind: {
	[kind in RefinementKind]: (
		node: nodeOfKind<kind>,
		schema: JsonSchemaOperandByKind[kind],
		ctx: JsonSchemaContext
	) => JsonSchema
} = {
	pattern: (node, base, ctx) => {
		if (!isJsonSchemaPattern(node, ctx)) {
			return ctx.fallback.patternFlags({
				code: "patternFlags",
				base,
				pattern: node.rule,
				flags: node.flags!
			})
		}
		if (base.pattern) {
			return ctx.fallback.patternIntersection({
				code: "patternIntersection",
				base: base as ToJsonSchema.StringSchemaWithPattern,
				pattern: node.rule
			})
		}
		base.pattern = node.rule
		// a keyword's pattern carries the format or encoding naming its strings
		if (node.meta.format) base.format = node.meta.format
		if (node.meta.contentEncoding)
			writeAnnotation(base, "contentEncoding", node.meta.contentEncoding, ctx)
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
				return ToJsonSchema.throwOperandError("exactLength", schema)
		}
	},
	max: (node, schema, ctx) =>
		writeBound(node, schema, ctx, "maximum", "exclusiveMaximum"),
	min: (node, schema, ctx) =>
		writeBound(node, schema, ctx, "minimum", "exclusiveMinimum"),
	notEqual: (node, schema, ctx) => {
		if (node.rule instanceof Date) {
			return ctx.fallback.date({
				code: "date",
				base: schema,
				notEqual: node.rule
			})
		}
		schema.not =
			schema.not ?
				{
					enum: [
						...("enum" in schema.not ?
							(schema.not as JsonSchema.Enum).enum
						:	[schema.not.const]),
						node.rule
					]
				}
			: ctx.target === "openapi-3.0" ? { enum: [node.rule] }
			: { const: node.rule }
		return schema
	},
	notEqualLength: (node, schema, ctx) => {
		const excluded: JsonSchema =
			schema.type === "string" ?
				{ type: "string", minLength: node.rule, maxLength: node.rule }
			:	{ ...arraySchemaOf(ctx), minItems: node.rule, maxItems: node.rule }
		schema.not =
			schema.not ?
				{
					anyOf: [
						...("anyOf" in schema.not ?
							(schema.not as JsonSchema.Union).anyOf
						:	[schema.not]),
						excluded
					]
				}
			:	excluded
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
				return ToJsonSchema.throwOperandError("maxLength", schema)
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
				return ToJsonSchema.throwOperandError("minLength", schema)
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
				return ToJsonSchema.throwOperandError("structure", schema)
		}
	},
	predicate: (node, base, ctx) =>
		// JSON Schema's object type already excludes arrays
		node.predicate === isNonArray ?
			base
		:	ctx.fallback.predicate({
				code: "predicate",
				base,
				predicate: node.predicate
			})
}

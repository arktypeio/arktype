import {
	$ark,
	foreignTypesByMorph,
	hasArkKind,
	mergeToJsonSchemaConfigs,
	openApiNull,
	ToJsonSchema,
	unionJsonSchemaWritersKey,
	writeForeignArkMessage,
	writeNullableJsonSchema,
	writeUnionJsonSchema,
	writeUnresolvableMessage,
	type UnionJsonSchemaWriters,
	type Alias,
	type BaseRoot,
	type BaseScope,
	type JsonSchema,
	type Prop,
	type RefinementKind,
	type RootKind,
	type Sequence,
	type StandardJSONSchemaV1,
	type StandardSchemaV1,
	type Structure,
	type Union,
	type UnionDiscriminant,
	type nodeOfKind
} from "@ark/schema"
import {
	appendStringifiedKey,
	defineValue,
	flatMorph,
	hasOwn,
	isEmptyObject,
	throwParseError,
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
	/** the alias each node aliasDefs writes as a def is named by */
	aliasNamesById: Record<string, string>
	/** the scopes whose aliases are in aliasNamesById */
	aliasScopes: Set<BaseScope>
	/** the names aliasDefs lists that a scope reached has */
	aliasesFound: Set<string>
	defs: Record<string, JsonSchema | undefined>
	/** what each $ref's pointer starts with, before the name of its def */
	refPrefix: string
	writers: UnionJsonSchemaWriters
}

// a precompiled validator replays a call's fallback as the build recorded it
// (ark/type/standalone/fallbacks.ts), seeing every read of what one returns
// but a check for nullish, so it mirrors those: a Date's date ?? proto and a
// default's undefined. A union, which reads them, is written by these again.
export const jsonSchemaWriters: UnionJsonSchemaWriters = {
	union: writeUnionJsonSchema,
	nullable: writeNullableJsonSchema
}

export const jsonSchemaContextOf = (
	cfg: ToJsonSchema.Context,
	writers: UnionJsonSchemaWriters
): JsonSchemaContext => ({
	...cfg,
	path: "",
	open: [],
	defNamesById: {},
	aliasNamesById: {},
	aliasScopes: new Set(),
	aliasesFound: new Set(),
	defs: {},
	refPrefix: refPrefixOf(cfg),
	writers
})

export const rootToJsonSchema = (
	node: BaseRoot,
	opts: ToJsonSchema.Options
): JsonSchema => {
	const ctx = jsonSchemaContextOf(
		mergeToJsonSchemaConfigs(node.$.cfg.toJsonSchema, opts),
		(opts as { [unionJsonSchemaWritersKey]?: UnionJsonSchemaWriters })[
			unionJsonSchemaWritersKey
		] ?? jsonSchemaWriters
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
	if (Array.isArray(ctx.aliasDefs)) {
		const missing = ctx.aliasDefs.find(name => !ctx.aliasesFound.has(name))
		if (missing !== undefined)
			throwParseError(writeUnresolvableMessage(missing))
	}

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
	"openapi-3.0": "#/components/schemas/",
	"openapi-3.1": "#/components/schemas/"
}

// ~standard.jsonSchema returns one schema, not the document holding it, so
// for OpenAPI its $refs point to the definitions written beside them, as
// zod's do, for a caller to move to components.schemas with the refs. Not
// where a configured defs handler expects #/components/schemas/
export const refPrefixOf = (ctx: ToJsonSchema.Context): string =>
	(
		ctx.target === "openapi-3.0" &&
		ctx.fallback.defs === ToJsonSchema.standardFallback.defs
	) ?
		"#/definitions/"
	:	refPrefixByTarget[ctx.target]

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
	// so is one aliasDefs names
	if (ctx.aliasDefs) {
		// a scope is reached before what it names, through what references it
		if (!ctx.aliasScopes.has(node.$)) addAliasNames(node.$, ctx)
		const aliasName = ctx.aliasNamesById[node.id]
		if (aliasName !== undefined) nameDef(node, aliasName, ctx)
	}
	const i = ctx.open.lastIndexOf(node.id)
	// a cycle through no def is named by its id, like useRefs' parts
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
	({ $ref: ctx.refPrefix + name }) as JsonSchema.Ref

// the alias a cyclic definition's id starts with, without the count after it,
// which follows an underscore where the alias ends in a digit. No lookbehind:
// one in a literal fails the whole module to parse before Safari 16.4
const nameOfId = (id: string): string => id.replace(/(\d)_\d+$|\d+$/, "$1")

// an input or output is named by the alias it was read from; an alias of an
// anonymous value, like a union holding an alias, names nothing
const aliasNameOf = (node: Alias.Node): string | undefined =>
	node.isIo ? aliasNameOf(node.operands![0] as Alias.Node)
	: node.reference === node.resolution.id ? nameOfId(node.reference)
	: undefined

// a non-cyclic alias is resolved where it's referenced, so nothing in a Type
// says it came from one. What's written as its def is instead each part that
// is the node it resolves to, as a scope reuses its nodes by what they are and
// a node keeps them in a Type of another scope. Its input and output are too,
// where they differ, as ~standard.jsonSchema.input writes a Type's input
const addAliasNames = ($: BaseScope, ctx: JsonSchemaContext): void => {
	ctx.aliasScopes.add($)
	const aliasDefs = ctx.aliasDefs as true | readonly string[]
	const listed = aliasDefs !== true
	// a keyword isn't a name you gave anything, so ark's are defs only by name
	if (!listed && $.isBuiltin) return
	// a submodule's aliases are named by their own names, like cyclic ones
	const add = (path: string, name: string): boolean => {
		const def = path
			.split(".")
			.reduce<unknown>((m, k) => (m as dict | undefined)?.[k], $.aliases)
		// the scope binds each of a module's aliases anew, so they're reached
		// through it by their paths, and its root by its own
		if (hasArkKind(def, "module")) {
			for (const k in def) {
				if (k === "root") addResolution(path, name)
				else add(`${path}.${k}`, k)
			}
		} else if (def !== undefined) addResolution(path, name)
		return def !== undefined
	}
	const addResolution = (path: string, name: string): void => {
		const resolution = $.maybeResolve(path)
		if (!hasArkKind(resolution, "root")) return
		// finalized, as what .in and .out hold of a Type
		const parts = [resolution, resolution.in, resolution.out] as BaseRoot[]
		for (const part of parts) {
			// a basis like string is everywhere, so it's a def only by name
			if (part.alwaysExpandJsonSchema && !(listed && part === resolution))
				continue
			ctx.aliasNamesById[part.id] ??= name
		}
	}
	for (const alias of listed ? aliasDefs : $.exportedNames) {
		const path = alias[0] === "#" ? alias.slice(1) : alias
		const dot = path.indexOf(".")
		// an alias of another scope, or a keyword, isn't this one's
		if (!hasOwn($.aliases, dot === -1 ? path : path.slice(0, dot))) continue
		if (add(path, path.slice(path.lastIndexOf(".") + 1)) && listed)
			ctx.aliasesFound.add(alias)
	}
}

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
		if (!annotationKeys.has(k) && !k.startsWith("x-")) continue
		const v = (node.meta as dict)[k]
		// JSON can't represent a function like a message writer
		if (typeof v === "function" && k !== "default") continue
		// metaJson serializes non-primitives like [5] to references like
		// "$ark.array1", so prefer the original value when it is valid JSON
		// (jsonData's object domain also allows functions, so exclude them)
		const jsonValue =
			typeof v !== "function" && $ark.kw.jsonData.allows(v) ? v
			: k === "default" ?
				ctx.fallback.defaultValue({ code: "defaultValue", value: v as never })
			:	(node.metaJson as dict)[k]
		if (jsonValue !== undefined) writeAnnotation(result, k, jsonValue, ctx)
	}

	return jsonSchema ? Object.assign(result, jsonSchema) : result
}

// the meta written as annotations: JSON Schema's own and any x- extension.
// Any other key, like arktype's alias, onFail, the words of its errors or a
// key ArkEnv.meta adds, is no JSON Schema keyword, which a strict validator
// like Ajv, an OpenAPI 3.0 linter or an LLM API rejects, so jsonSchema meta
// writes it instead
const annotationKeys: ReadonlySet<string> = new Set([
	"title",
	"description",
	"default",
	"examples",
	"deprecated",
	"readOnly",
	"writeOnly",
	"$comment",
	"format",
	"contentEncoding",
	"contentMediaType"
])

const branchGroupsToJsonSchema = (
	node: Union.Node,
	branchGroups: BaseRoot[],
	ctx: JsonSchemaContext
): JsonSchema =>
	// special case to simplify { const: true } | { const: false }
	// to the canonical JSON Schema representation { type: "boolean" }
	branchGroups.length === 1 && branchGroups[0].equals($ark.kw.boolean) ?
		{ type: "boolean" }
	:	ctx.writers.union(
			branchGroups.map(group => toJsonSchemaRecurse(group, ctx)),
			ctx.target,
			node.meta,
			node.metaJson,
			discriminantOf(branchGroups, ctx)
		)

// the first key the first branch requires at which every branch requires
// strings no other branch allows, as OpenAPI's discriminator expects: any
// other union, like one whose branches share a value or one without the key,
// is written as anyOf
const discriminantOf = (
	branches: BaseRoot[],
	ctx: JsonSchemaContext
): UnionDiscriminant | undefined => {
	const tagsByBranch: Tags[] = []
	for (const branch of branches) {
		const tags = tagsOf(branch, ctx)
		if (!tags) return
		tagsByBranch.push(tags)
	}
	keys: for (const key of tagsByBranch[0]?.keys() ?? []) {
		const seen = new Set<string>()
		const values: string[][] = []
		for (const tags of tagsByBranch) {
			const branchValues = tags.get(key)
			if (!branchValues) continue keys
			for (const value of branchValues) {
				if (seen.has(value)) continue keys
				seen.add(value)
			}
			values.push(branchValues)
		}
		return {
			key,
			values,
			writesKeyword:
				ctx.discriminator ??
				(ctx.target === "openapi-3.0" || ctx.target === "openapi-3.1")
		}
	}
}

// the strings an object branch requires at each key that allows only strings,
// as its schema writes them in properties and required. A Map, since a key
// can be one an object inherits, like constructor
type Tags = Map<string, string[]>

const tagsOf = (branch: BaseRoot, ctx: JsonSchemaContext): Tags | undefined => {
	if (branch.meta.jsonSchema) return
	if (branch.is("alias")) return tagsOf(branch.resolution, ctx)
	// only an input is written as what a morph accepts
	if (branch.is("morph")) {
		const accepted = branch.declaredIn ?? branch.head
		return ctx.io === "in" && accepted ? tagsOf(accepted, ctx) : undefined
	}
	if (!branch.is("intersection")) return
	const { basis, structure } = branch
	if (
		!structure ||
		structure.meta.jsonSchema ||
		!basis?.is("domain") ||
		basis.domain !== "object"
	)
		return
	const tags: Tags = new Map()
	for (const prop of structure.required ?? []) {
		const values = prop.value.meta.jsonSchema ? [] : stringUnitsOf(prop.value)
		if (typeof prop.key === "string" && values.length)
			tags.set(prop.key, values)
	}
	return tags
}

const stringUnitsOf = (node: BaseRoot): string[] => {
	const values: string[] = []
	for (const branch of node.branches) {
		if (!branch.is("unit") || typeof branch.unit !== "string") return []
		values.push(branch.unit)
	}
	return values
}

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
	}
	// nor $comment or contentMediaType, which it has nothing for
	else if (k !== "$comment" && k !== "contentMediaType") annotations[k] = v
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
			} else branchGroups[firstBooleanIndex] = $ark.kw.boolean
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
		let branchGroups = branchGroupsOf(node)
		// JSON has no undefined, so no input can match an undefined branch,
		// and an input schema is exactly what's left without it. Output and
		// root schemas keep it for fallback.unit: data with an undefined
		// required key serializes without that key, which no schema listing
		// it in required accepts.
		if (ctx.io === "in")
			branchGroups = branchGroups.filter(group => !group.hasUnit(undefined))
		const nonNull = branchGroups.filter(branch => !branch.hasUnit(null))
		// an input's null | undefined is null, not anyOf with never beside it
		if (!nonNull.length && branchGroups.length) return nullSchemaOf(ctx)
		return nonNull.length === branchGroups.length ?
				branchGroupsToJsonSchema(node, branchGroups, ctx)
			:	ctx.writers.nullable(
					branchGroupsToJsonSchema(node, nonNull, ctx),
					nonNull.length > 1,
					ctx.target
				)
	},
	morph: (node, ctx) => {
		const foreign = foreignTypesByMorph.get(node.piped[0] as never)
		if (foreign && (ctx.io === "in" || node.piped.length === 1)) {
			return foreignToJsonSchema(
				foreign,
				node.head?.isUnknown() === false ? node.head : undefined,
				ctx
			)
		}
		return ctx.io === "in" ?
				// its input as written, since _in drops the defaults it holds
				toJsonSchemaRecurse(
					node.declaredIn ?? node.head ?? $ark.kw.unknown.internal,
					ctx
				)
			:	ctx.fallback.morph({
					code: "morph",
					base: toJsonSchemaRecurse(node._in, ctx),
					out: node.tail ? toJsonSchemaRecurse(node.tail._out, ctx) : null
				})
	},
	unit: (node, ctx) =>
		// this is the more standard JSON schema representation, especially for Open API
		node.unit === null ? nullSchemaOf(ctx)
		: !$ark.kw.jsonPrimitive.allows(node.unit) ?
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

// a Type from another copy of arktype, like 2.x, writes its own
const foreignToJsonSchema = (
	t: StandardSchemaV1,
	head: BaseRoot | undefined,
	ctx: JsonSchemaContext
): JsonSchema => {
	const { jsonSchema } = t["~standard"] as Partial<StandardJSONSchemaV1.Props>
	let input: JsonSchema | undefined
	let output: JsonSchema | undefined
	try {
		if (jsonSchema) {
			input = writeOwn(jsonSchema.input, ctx)
			output = ctx.io === "in" ? input : writeOwn(jsonSchema.output, ctx)
		}
	} catch {
		// e.g. 2.x writes no "openapi-3.0"
	}
	if (!input || !output) return foreignFallback(ctx)
	const json = JSON.stringify(input)
	if (json !== JSON.stringify(output)) {
		return foreignFallback(
			ctx,
			"its input and output differ, so only ~standard.jsonSchema.input can write it",
			{ base: input, out: output }
		)
	}
	// its refs resolve against its own document, not the one it's written into
	if (/"\$(ref|dynamicRef|recursiveRef)"/.test(json))
		return foreignFallback(ctx, "it references its own definitions")
	if (head && ctx.io !== "in")
		return foreignFallback(ctx, "it's intersected with another Type")
	return head ? { allOf: [toJsonSchemaRecurse(head, ctx), input] } : input
}

const writeOwn = (
	write: StandardJSONSchemaV1.Converter["input"],
	ctx: JsonSchemaContext
): JsonSchema => {
	// an OpenAPI 3.1 Schema Object is draft-2020-12, which Standard JSON Schema names
	const { $schema, ...schema } = write({
		target: ctx.target === "openapi-3.1" ? "draft-2020-12" : ctx.target
	})
	return schema
}

const foreignFallback = (
	ctx: JsonSchemaContext,
	reason?: string,
	sides: Pick<ToJsonSchema.MorphContext, "base" | "out"> = {
		base: {},
		out: null
	}
): JsonSchema => {
	try {
		return ctx.fallback.morph({ code: "morph", ...sides })
	} catch (e) {
		if (!(e instanceof ToJsonSchema.Error) || !e.hasCode("morph")) throw e
		return ToJsonSchema.throw(
			"morph",
			e.context,
			ctx.path,
			`Can't convert the Type${ctx.path && ` at ${ctx.path}`} to ${ctx.target} JSON Schema${reason ? `, since ${reason}` : ""}. ${writeForeignArkMessage("It")}`
		)
	}
}

const reduceObjectJsonSchema = (
	node: Structure.Node,
	schema: JsonSchema.Object,
	ctx: JsonSchemaContext
): JsonSchema.Object => {
	// keys an index declares are written as its patterns instead
	if (node.index && !node.props.length) delete schema.properties
	if (node.props.length) schema = writeProps(node, schema, ctx)

	const indexes: IndexWrites = { keys: [] }
	for (const index of node.index ?? [])
		schema = writeIndex(index, node, schema, ctx, indexes)
	const indexKeys = indexes.keys

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
		schema.propertyNames = indexKeys[0].key
		if (declaredValuesExtend(node, indexKeys[0].valueNode))
			schema.additionalProperties = indexKeys[0].value
		// a declared key's value must be the index's too, which only a pattern
		// every key matches checks
		else schema.patternProperties = { "": indexKeys[0].value }
		return schema
	}

	if (
		schema.patternProperties?.[""] &&
		Object.keys(schema.patternProperties).length === 1 &&
		indexes.anyString &&
		declaredValuesExtend(node, indexes.anyString)
	) {
		// with no other patterns, the index adds nothing declared keys don't
		// already check, so it's written as additionalProperties, which OpenAPI
		// 3.0 and structured outputs without patternProperties read
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

// additionalProperties skips declared keys, so it holds an index's value only
// where each declared key's value is already within it
const declaredValuesExtend = (node: Structure.Node, value: BaseRoot): boolean =>
	node.props.every(
		prop => typeof prop.key === "symbol" || jsonValueOf(prop).extends(value)
	)

const writeProps = (
	node: Structure.Node,
	schema: JsonSchema.Object,
	ctx: JsonSchemaContext
): JsonSchema.Object => {
	const path = ctx.path
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

		if (prop.hasDef()) writeDefault(valueSchema, prop.default, ctx)

		// assigning "__proto__" would set the prototype
		defineValue(schema.properties!, prop.key, valueSchema)
	}
	ctx.path = path
	if (node.requiredKeys.length && schema.properties) {
		schema.required = node.requiredKeys.filter(
			(k): k is string => typeof k === "string" && k in schema.properties!
		)
	}
	return schema
}

// a string key with a pattern is written as patternProperties, and one
// without is collected for the fallbacks once the schema's own keys are known
const writeIndex = (
	index: nodeOfKind<"index">,
	node: Structure.Node,
	schema: JsonSchema.Object,
	ctx: JsonSchemaContext,
	indexes: IndexWrites
): JsonSchema.Object => {
	const path = ctx.path
	ctx.path = `${path}[${index.signature.expression}]`
	const valueJsonSchema = toJsonSchemaRecurse(index.value, ctx)
	ctx.path = path

	for (const keyBranch of index.signature.branches) {
		if (!keyBranch.extends($ark.kw.string)) {
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
			// OpenAPI 3.0 has no patternProperties, only additionalProperties
			(ctx.target !== "openapi-3.0" ||
				(pattern === "" && declaredValuesExtend(node, index.value)))
		) {
			defineValue((schema.patternProperties ??= {}), pattern, valueJsonSchema)
			if (pattern === "") indexes.anyString = index.value
			continue
		}

		indexes.keys.push({
			node: keyIn,
			key: keySchema ?? (toResolvedJsonSchema(keyIn, ctx) as never),
			value: valueJsonSchema,
			valueNode: index.value
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
	valueNode: BaseRoot
}

interface IndexWrites {
	// keys no pattern matches exactly, for propertyNames or the fallbacks
	keys: IndexKey[]
	// the value of an index any string key matches, written as the pattern ""
	anyString?: BaseRoot
}

// the pattern matching exactly the keys an index signature's key allows
const keyPatternOf = (
	key: BaseRoot,
	ctx: JsonSchemaContext
): string | undefined => {
	// declared keys are checked against an index signature too, which
	// additionalProperties skips
	if (key.is("domain")) return ""
	if (!key.is("intersection") || key.refinements.length !== 1) return
	const [refinement] = key.refinements
	return refinement.is("pattern") && isJsonSchemaPattern(refinement, ctx) ?
			refinement.rule
		:	undefined
}

// d and g don't change what a pattern matches, and draft-2020-12 patterns use u
const isJsonSchemaPattern = (
	node: nodeOfKind<"pattern">,
	ctx: JsonSchemaContext
): boolean =>
	!node.flags ||
	[...node.flags].every(
		flag =>
			flag === "d" ||
			flag === "g" ||
			(flag === "u" &&
				(ctx.target === "draft-2020-12" || ctx.target === "openapi-3.1"))
	)

const writeDefault = (
	schema: JsonSchema,
	defaultInput: unknown,
	ctx: JsonSchemaContext
): void => {
	const value =
		typeof defaultInput === "function" ? defaultInput() : defaultInput
	const jsonDefault =
		$ark.kw.jsonData.allows(value) ?
			value
		:	ctx.fallback.defaultValue({ code: "defaultValue", value })
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

	// OpenAPI 3.0's items is one schema for every element, so it has no prefix
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

const nullSchemaOf = (ctx: JsonSchemaContext): JsonSchema =>
	ctx.target === "openapi-3.0" ? openApiNull() : { type: "null" }

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
	// openapi-3.0 marks the bound itself exclusive, with a boolean the type
	// leaves out to fit JSONSchema7
	else if (ctx.target === "openapi-3.0")
		Object.assign(schema, { [key]: node.rule, [exclusiveKey]: true })
	else schema[exclusiveKey] = node.rule
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

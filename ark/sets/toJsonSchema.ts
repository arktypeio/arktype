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
	type BaseNode,
	type BaseRoot,
	type BaseScope,
	type Intersection,
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
		toJsonSchemaRecurse(ctx.io === "out" ? node._out : node, ctx)
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
		(i !== -1 &&
			ctx.open.slice(i).every(id => !hasOwn(ctx.defNamesById, id))) ||
		(ctx.useRefs && !node.alwaysExpandJsonSchema)
	)
		nameDef(node, nameOfId(node.id), ctx)
	const name =
		hasOwn(ctx.defNamesById, node.id) ? ctx.defNamesById[node.id] : undefined
	if (
		name !== undefined &&
		(i !== -1 || (hasOwn(ctx.defs, name) && ctx.defs[name] !== undefined))
	)
		return refTo(name, ctx)
	ctx.open.push(node.id)
	const schema = toResolvedJsonSchema(node, ctx)
	ctx.open.pop()
	// reaching it again while it was converted can have named it
	const defName =
		hasOwn(ctx.defNamesById, node.id) ? ctx.defNamesById[node.id] : undefined
	if (defName === undefined) return schema
	defineValue(ctx.defs, defName, schema)
	return refTo(defName, ctx)
}

const refTo = (name: string, ctx: JsonSchemaContext): JsonSchema.Ref =>
	({
		$ref:
			ctx.refPrefix +
			encodeURIComponent(name.replace(/~/g, "~0").replace(/\//g, "~1"))
	}) as JsonSchema.Ref

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
	if (hasOwn(ctx.defNamesById, node.id)) return
	let unique = name
	for (let i = 2; hasOwn(ctx.defs, unique); i++) unique = `${name}${i}`
	// reserved, so $defs are in the order they're named
	defineValue(ctx.defs, unique, undefined)
	defineValue(ctx.defNamesById, node.id, unique)
}

const nonJsonAnnotation = Symbol()

const jsonAnnotationValue = (
	value: unknown,
	seen: Set<object> = new Set()
): unknown => {
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return value
	if (typeof value === "number")
		return Number.isFinite(value) ? value : nonJsonAnnotation
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? nonJsonAnnotation : (
				value.toISOString()
			)
	}
	if (typeof value !== "object" || seen.has(value)) return nonJsonAnnotation
	seen.add(value)
	if (Array.isArray(value)) {
		const out: unknown[] = []
		for (let i = 0; i < value.length; i++) {
			if (!(i in value)) {
				seen.delete(value)
				return nonJsonAnnotation
			}
			const jsonItem = jsonAnnotationValue(value[i], seen)
			if (jsonItem === nonJsonAnnotation) {
				seen.delete(value)
				return nonJsonAnnotation
			}
			out.push(jsonItem)
		}
		seen.delete(value)
		return out
	}
	const proto = Object.getPrototypeOf(value)
	if (proto !== Object.prototype && proto !== null) {
		seen.delete(value)
		return nonJsonAnnotation
	}
	const out: dict = {}
	for (const [k, prop] of Object.entries(value)) {
		const jsonProp = jsonAnnotationValue(prop, seen)
		if (jsonProp === nonJsonAnnotation) {
			seen.delete(value)
			return nonJsonAnnotation
		}
		defineValue(out, k, jsonProp)
	}
	seen.delete(value)
	return out
}

const examplesAnnotationValue = (value: unknown): unknown[] | undefined => {
	if (!Array.isArray(value)) return undefined
	if (!value.length) return []
	const out: unknown[] = []
	for (let i = 0; i < value.length; i++) {
		if (!(i in value)) continue
		const jsonEntry = jsonAnnotationValue(value[i])
		if (jsonEntry !== nonJsonAnnotation) out.push(jsonEntry)
	}
	return out.length ? out : undefined
}

const writeNodeAnnotations = (
	result: dict,
	node: BaseRoot,
	ctx: JsonSchemaContext
): void => {
	for (const k in node.meta) {
		if (!annotationKeys.has(k) && !k.startsWith("x-")) continue
		const v = (node.meta as dict)[k]
		// JSON can't represent a function like a message writer
		if (typeof v === "function" && k !== "default") continue
		let jsonValue: unknown
		if (k === "examples") jsonValue = examplesAnnotationValue(v)
		else if (k === "default") {
			jsonValue =
				typeof v !== "function" && $ark.kw.jsonData.allows(v) ?
					v
				:	ctx.fallback.defaultValue({
						code: "defaultValue",
						value: v as never
					})
		} else {
			const converted = jsonAnnotationValue(v)
			if (converted !== nonJsonAnnotation) jsonValue = converted
		}
		if (jsonValue !== undefined) writeAnnotation(result, k, jsonValue, ctx)
	}
}

// writeInner writes what its constraints imply, beside which its meta is written
const toResolvedJsonSchema = (
	node: BaseRoot,
	ctx: JsonSchemaContext,
	writeInner: () => JsonSchema = () =>
		innerToJsonSchemaByKind[node.kind](node as never, ctx)
): JsonSchema => {
	const { jsonSchema } = node.meta
	const result: JsonSchema & dict = jsonSchema ? {} : (writeInner() as never)

	writeNodeAnnotations(result, node, ctx)

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
): JsonSchema => {
	// special case to simplify { const: true } | { const: false }
	// to the canonical JSON Schema representation { type: "boolean" }
	if (branchGroups.length === 1 && branchGroups[0].equals($ark.kw.boolean))
		return { type: "boolean" }
	const branchSchemas = branchGroups.map(group =>
		toJsonSchemaRecurse(group, ctx)
	)
	if (!isEmptyObject(node.meta)) {
		const unionAnnotations: dict = {}
		writeNodeAnnotations(unionAnnotations, node, ctx)
		if (!isEmptyObject(unionAnnotations)) {
			for (let i = 0; i < branchSchemas.length; i++) {
				const branch = branchSchemas[i]
				const group = branchGroups[i]
				if ("$ref" in branch || group.meta.jsonSchema) continue
				const branchDict = branch as dict
				for (const [k, v] of Object.entries(unionAnnotations)) {
					if (
						hasOwn(branchDict, k) &&
						(branchDict[k] === v ||
							(k in group.meta &&
								(group.meta as dict)[k] === (node.meta as dict)[k]))
					)
						delete branchDict[k]
				}
			}
		}
	}
	return ctx.writers.union(
		branchSchemas,
		ctx.target,
		node.meta,
		node.metaJson,
		discriminantOf(branchGroups, ctx)
	)
}

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
	// nor $comment, or contentMediaType, whose equivalent is a request's media
	// type, which no Schema Object holds
	else if (k !== "$comment" && k !== "contentMediaType") annotations[k] = v
}

// a keyword's own schema, like string.json's, is written for the target, but
// one you configure is written as configured
const writeJsonSchemaMeta = (
	schema: JsonSchema,
	node: BaseNode,
	ctx: JsonSchemaContext
): JsonSchema => {
	const jsonSchema = node.meta.jsonSchema as dict
	if (!node.meta.keyword) return Object.assign(schema, jsonSchema)
	for (const k in jsonSchema) writeAnnotation(schema, k, jsonSchema[k], ctx)
	return schema
}

type DateBounds = Pick<
	ToJsonSchema.DateContext,
	"before" | "after" | "notEqual"
>

const isDateBound = (node: BaseNode): boolean =>
	node.is("before") ||
	node.is("after") ||
	(node.is("notEqual") && node.rule instanceof Date)

// a Date's bounds, given to one call of fallback.date with the Date itself
const dateBoundsOf = (node: Intersection.Node): DateBounds | undefined => {
	let before: Date | undefined
	let after: Date | undefined
	const notEqual: Date[] = []
	for (const child of node.children) {
		if (child.is("before")) before = child.rule
		else if (child.is("after")) after = child.rule
		else if (child.is("notEqual") && child.rule instanceof Date)
			notEqual.push(child.rule)
	}
	if (!before && !after && !notEqual.length) return
	// only the keys it has, as a handler spreading them expects
	return {
		...(before && { before }),
		...(after && { after }),
		...(notEqual.length ? { notEqual } : {})
	}
}

// a precompiled validator's replay calls proto where date returns nullish
// for a call writing a Date, which it finds by its empty base
const dateToJsonSchema = (
	bounds: DateBounds | undefined,
	ctx: JsonSchemaContext
): JsonSchema =>
	ctx.fallback.date?.({ code: "date", base: {}, ...bounds }) ??
	ctx.fallback.proto({ code: "proto", base: {}, proto: Date })

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
		// JSON has no undefined, so no input can match an undefined branch
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
	intersection: (node, ctx) => {
		const dateBounds = dateBoundsOf(node)
		// written with the Date itself, or after a subclass of it
		let datesWritten = false
		return node.children.reduce<JsonSchema>(
			// cast is required since TS doesn't know children have compatible schema prerequisites
			(schema, child) => {
				if (child.isBasis()) {
					if (!dateBounds || !child.is("proto") || child.proto !== Date)
						return toJsonSchemaRecurse(child, ctx)
					return toResolvedJsonSchema(child, ctx, () => {
						datesWritten = true
						return dateToJsonSchema(dateBounds, ctx)
					})
				}
				if (isDateBound(child)) {
					if (datesWritten) return schema
					datesWritten = true
					return ctx.fallback.date({
						code: "date",
						base: schema,
						...dateBounds
					})
				}
				return child.meta.jsonSchema ?
						writeJsonSchemaMeta(schema, child, ctx)
					:	reduceJsonSchemaByKind[child.kind as ReducedKind](
							child as never,
							schema as never,
							ctx
						)
			},
			{}
		)
	},
	proto: (node, ctx) => {
		switch (node.builtinName) {
			case "Array":
				return arraySchemaOf(ctx)
			case "Date":
				return dateToJsonSchema(undefined, ctx)
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
		(node.undeclared === "delete" && ctx.io === "out")

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
		if (declaredValuesExtend(node, indexKeys[0].valueNode, ctx))
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
		declaredValuesExtend(node, indexes.anyString, ctx)
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
const declaredValuesExtend = (
	node: Structure.Node,
	value: BaseRoot,
	ctx: JsonSchemaContext
): boolean =>
	node.props.every(
		prop =>
			typeof prop.key === "symbol" || jsonValueOf(prop, ctx).extends(value)
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
		const valueSchema = toJsonSchemaRecurse(jsonValueOf(prop, ctx), ctx)

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
	if (node.required?.length && schema.properties) {
		const required = node.required.flatMap(prop =>
			(
				typeof prop.key !== "string" ||
				!(prop.key in schema.properties!) ||
				(ctx.io === "out" && prop.value.allowsUnused(undefined))
			) ?
				[]
			:	[prop.key]
		)
		if (required.length) schema.required = required
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
	const indexValue =
		ctx.io === "out" ? withoutUndefined(index.value) : index.value
	const path = ctx.path
	ctx.path = `${path}[${index.signature.expression}]`
	const valueJsonSchema = toJsonSchemaRecurse(indexValue, ctx)
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
				(pattern === "" && declaredValuesExtend(node, indexValue, ctx)))
		) {
			defineValue((schema.patternProperties ??= {}), pattern, valueJsonSchema)
			if (pattern === "") indexes.anyString = indexValue
			continue
		}

		indexes.keys.push({
			node: keyIn,
			key: keySchema ?? (toResolvedJsonSchema(keyIn, ctx) as never),
			value: valueJsonSchema,
			valueNode: indexValue
		})
	}
	return schema
}

// JSON has no undefined: an optional key, or any object key or index value on
// output, holds undefined only by being absent
const withoutUndefined = (value: BaseRoot): BaseRoot => {
	const resolved = value.is("alias") ? value.resolution : value
	if (!resolved.branches.some(branch => branch.hasUnit(undefined))) return value
	const stripped = resolved.$.schema(
		resolved.branches.filter(branch => !branch.hasUnit(undefined))
	)
	return isEmptyObject(resolved.meta) ? stripped : (
			stripped.configure(resolved.meta, "self")
		)
}

const jsonValueOf = (prop: Prop.Node, ctx: JsonSchemaContext): BaseRoot =>
	prop.optional || ctx.io === "out" ? withoutUndefined(prop.value) : prop.value

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

// JSON Schema compiles pattern with "u"; reject flagless sources that fail,
// invert meaning (\p{...}, \P{...}, \u{...}), or contain astral/surrogate code
// units whose matching changes under "u"
const surrogateEscapePattern = /^[Dd][89A-Fa-f][\dA-Fa-f]{2}/

const differsUnderUnicodeFlag = (source: string): boolean => {
	try {
		new RegExp(source, "u")
	} catch {
		return true
	}
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i)
		if (code >= 0xd800 && code <= 0xdfff) return true
		if (code === 0x5c) {
			const escaped = source[++i]
			if (
				(escaped === "p" || escaped === "P" || escaped === "u") &&
				source[i + 1] === "{"
			)
				return true
			if (
				escaped === "u" &&
				surrogateEscapePattern.test(source.slice(i + 1, i + 5))
			)
				return true
		}
	}
	return false
}

// d and g don't change what a pattern matches, and draft-2020-12 patterns use u
const isJsonSchemaPattern = (
	node: nodeOfKind<"pattern">,
	ctx: JsonSchemaContext
): boolean => {
	let hasU = false
	if (node.flags) {
		for (const flag of node.flags) {
			if (flag === "u") {
				if (ctx.target !== "draft-2020-12" && ctx.target !== "openapi-3.1")
					return false
				hasU = true
			} else if (flag !== "d" && flag !== "g") return false
		}
	}
	return hasU || !differsUnderUnicodeFlag(node.rule)
}

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
	if (node.minLength)
		schema.minItems = Math.max(schema.minItems ?? 0, node.minLength)

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
		if (node.maxLength) {
			schema.maxItems = Math.min(
				schema.maxItems ?? Number.POSITIVE_INFINITY,
				node.maxLength
			)
		}

		// postfix can only be present if variadic is present so nesting this is fine
		if (postfixSchemas) {
			schema = ctx.fallback.arrayPostfix({
				code: "arrayPostfix",
				base: schema as ToJsonSchema.VariadicArraySchema,
				elements: postfixSchemas
			})
		}
	} else if (isOpenApi) {
		schema.maxItems = Math.min(
			schema.maxItems ?? Number.POSITIVE_INFINITY,
			node.maxLength!
		)
	} else {
		// For fixed-length tuples without variadic elements
		// draft-07 uses additionalItems: false, draft-2020-12 uses items: false
		if (isDraft07) schema.additionalItems = false
		else schema.items = false
		// delete maxItems only when items: false / additionalItems: false already enforces it
		if (schema.maxItems !== undefined && schema.maxItems >= node.maxLength!)
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
	structure: JsonSchema.Structure
	predicate: JsonSchema.Constrainable
}

// a Date's bounds are written with it
type ReducedKind = Exclude<RefinementKind, "before" | "after">

const reduceJsonSchemaByKind: {
	[kind in ReducedKind]: (
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
				flags: node.flags ?? ""
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

		// a multiple of -n is a multiple of n, and multipleOf must be positive
		schema.multipleOf = Math.abs(node.rule)

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
		// a Date's is written with it
		const rule = node.rule as number
		schema.not =
			schema.not ?
				{
					enum: [
						...("enum" in schema.not ?
							(schema.not as JsonSchema.Enum).enum
						:	[schema.not.const]),
						rule
					]
				}
			: ctx.target === "openapi-3.0" ? { enum: [rule] }
			: { const: rule }
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

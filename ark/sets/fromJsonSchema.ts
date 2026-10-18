import {
	$ark,
	Disjoint,
	defining,
	isNode,
	node,
	rootSchema,
	rootSchemaScope,
	type BaseNode,
	type BaseParseContext,
	type BaseRoot,
	type JsonSchema,
	type NodeSchema,
	type Predicate,
	type RootSchema
} from "@ark/schema"
import {
	cached,
	flatMorph,
	hashOf,
	hasOwn,
	isArray,
	printable,
	throwParseError,
	type array,
	type dict
} from "@ark/util"
// installs the engine, which reduces nodes as they're parsed
import "./engine.ts"
import { intersectNodesRoot } from "./intersections.ts"
import { isNonArray } from "./toJsonSchema.ts"

interface ReadContext {
	document: unknown
	// draft-07 and earlier ignore the keywords beside a $ref
	ignoresRefSiblings: boolean
	rootsByRef: Record<string, BaseRoot>
	refsBeingRead: string[]
	// a cyclic ref is named by its target, so it prints alike in any history
	cyclesByRef: Record<string, BaseParseContext>
	// a $ref within a nested $id resolves against that $id
	nestedIds: number
}

export const readJsonSchema = (
	schema: JsonSchema.Input,
	document: JsonSchema.Input = schema
): BaseRoot => {
	const ctx: ReadContext = {
		document,
		ignoresRefSiblings:
			isPlainObject(document) &&
			/draft-0[3-7]/.test(String((document as dict).$schema)),
		rootsByRef: {},
		refsBeingRead: [],
		cyclesByRef: {},
		nestedIds: 0
	}
	try {
		return rootSchemaScope.finalize(defining(() => read(schema, "#", ctx)))
	} finally {
		for (const ref in ctx.cyclesByRef)
			delete $ark.nodesByRegisteredId[ctx.cyclesByRef[ref].id]
	}
}

const read = (schema: unknown, pointer: string, ctx: ReadContext): BaseRoot => {
	if (typeof schema === "boolean")
		return schema ? $ark.intrinsic.unknown : $ark.intrinsic.never
	if (!isPlainObject(schema))
		return throwParseError(writeInvalidJsonSchemaMessage(pointer, schema))
	const o = schema as dict
	for (const k in o) checkKeyword(o, k, pointer)
	if (o.$ref !== undefined && ctx.ignoresRefSiblings)
		return readRef(o.$ref as string, pointer, ctx)
	const isNestedResource = o.$id !== undefined && schema !== ctx.document
	if (isNestedResource) ctx.nestedIds++
	let result = $ark.intrinsic.unknown
	for (const readKeywords of keywordReaders) {
		const constraint = readKeywords(o, pointer, ctx)
		if (constraint) result = intersectRoots(result, constraint)
	}
	if (isNestedResource) ctx.nestedIds--
	return withAnnotations(result, o)
}

type KeywordReader = (
	o: dict,
	pointer: string,
	ctx: ReadContext
) => BaseRoot | undefined

const readRef = (ref: string, pointer: string, ctx: ReadContext): BaseRoot => {
	if (ref[0] !== "#" || (ref.length > 1 && ref[1] !== "/") || ctx.nestedIds)
		return throwParseError(writeUnsupportedRefMessage(ref, `${pointer}/$ref`))
	if (ref in ctx.rootsByRef) return ctx.rootsByRef[ref]
	// a ref within its own target is a cycle, resolved once that's read
	if (ctx.refsBeingRead.includes(ref)) {
		ctx.cyclesByRef[ref] ??= rootSchemaScope.openSynthetic(
			`synthetic${hashOf(`${ref}\n${printable(resolveRef(ref, ctx))}`)}`
		)
		return rootSchemaScope.lazilyResolve(
			() => ctx.rootsByRef[ref],
			ctx.cyclesByRef[ref].id
		)
	}
	ctx.refsBeingRead.push(ref)
	const root = read(resolveRef(ref, ctx), ref, ctx)
	ctx.refsBeingRead.pop()
	return (ctx.rootsByRef[ref] = root)
}

const resolveRef = (ref: string, ctx: ReadContext): unknown =>
	ref === "#" ?
		ctx.document
	:	ref
			.slice(2)
			.split("/")
			.reduce((target, segment) => {
				const key = decodeURIComponent(segment)
					.replace(/~1/g, "/")
					.replace(/~0/g, "~")
				return (
						typeof target === "object" && target !== null && hasOwn(target, key)
					) ?
						(target as dict)[key]
					:	throwParseError(writeUnresolvableRefMessage(ref))
			}, ctx.document)

const intersectRoots = (l: BaseRoot, r: BaseRoot): BaseRoot =>
	intersectNodesRoot(l, r, rootSchemaScope).toNeverIfDisjoint()

const keywordReaders: KeywordReader[] = [
	(o, pointer, ctx) =>
		o.$ref === undefined ? undefined : readRef(o.$ref as string, pointer, ctx),
	o =>
		o.type === undefined ?
			undefined
		:	unionOf(
				(isArray(o.type) ? o.type : [o.type]).map(
					name => typeRoots()[name as JsonSchema.TypeName]
				)
			),
	o => (o.const === undefined ? undefined : constRoot(o.const)),
	o =>
		o.enum === undefined ?
			undefined
		:	unionOf((o.enum as array).map(constRoot)),
	o => {
		const constraints: RootSchema[] = []
		if (o.minimum !== undefined) constraints.push({ min: o.minimum as number })
		if (o.exclusiveMinimum !== undefined) {
			constraints.push({
				min: { rule: o.exclusiveMinimum as number, exclusive: true }
			})
		}
		if (o.maximum !== undefined) constraints.push({ max: o.maximum as number })
		if (o.exclusiveMaximum !== undefined) {
			constraints.push({
				max: { rule: o.exclusiveMaximum as number, exclusive: true }
			})
		}
		if (o.multipleOf !== undefined) {
			const divisor = o.multipleOf as number
			constraints.push(
				Number.isInteger(divisor) ?
					{ divisor }
				:	{
						predicate: [
							opaque(
								["multipleOf", divisor],
								`a multiple of ${divisor}`,
								(data: number) => Number.isInteger(data / divisor)
							)
						]
					}
			)
		}
		return constrainOwnType("number", constraints)
	},
	(o, pointer) => {
		const constraints: RootSchema[] = []
		if (o.minLength !== undefined)
			constraints.push({ minLength: o.minLength as number })
		if (o.maxLength !== undefined)
			constraints.push({ maxLength: o.maxLength as number })
		if (o.pattern !== undefined) {
			constraints.push({
				pattern: [patternSchemaOf(o.pattern as string, `${pointer}/pattern`)]
			})
		}
		return constrainOwnType("string", constraints)
	},
	(o, pointer, ctx) => constrainOwnType("array", readArray(o, pointer, ctx)),
	(o, pointer, ctx) => constrainOwnType("object", readObject(o, pointer, ctx)),
	(o, pointer, ctx) =>
		o.allOf === undefined ?
			undefined
		:	readEach(o.allOf as array, `${pointer}/allOf`, ctx).reduce(
				intersectRoots,
				$ark.intrinsic.unknown
			),
	(o, pointer, ctx) =>
		o.anyOf === undefined ?
			undefined
		:	unionOf(readEach(o.anyOf as array, `${pointer}/anyOf`, ctx)),
	(o, pointer, ctx) => {
		if (o.oneOf === undefined) return
		const branches = readEach(o.oneOf as array, `${pointer}/oneOf`, ctx)
		return branchesAreDisjoint(branches) ?
				unionOf(branches)
			:	opaqueRoot(
					["oneOf", idsOf(branches)],
					`exactly one of ${branches.map(branch => branch.description).join(", ")}`,
					data => branches.filter(branch => branch.allows(data)).length === 1
				)
	},
	(o, pointer, ctx) => {
		if (o.not === undefined) return
		const negated = read(o.not, `${pointer}/not`, ctx)
		return opaqueRoot(
			["not", negated.id],
			`not ${negated.description}`,
			data => !negated.allows(data)
		)
	},
	(o, pointer, ctx) => {
		if (o.if === undefined || (o.then === undefined && o.else === undefined))
			return
		const condition = read(o.if, `${pointer}/if`, ctx)
		const consequent = read(o.then ?? true, `${pointer}/then`, ctx)
		const alternative = read(o.else ?? true, `${pointer}/else`, ctx)
		return opaqueRoot(
			["if", idsOf([condition, consequent, alternative])],
			`${consequent.description} if ${condition.description}, else ${alternative.description}`,
			data =>
				condition.allows(data) ?
					consequent.allows(data)
				:	alternative.allows(data)
		)
	}
]

const readArray = (
	o: dict,
	pointer: string,
	ctx: ReadContext
): RootSchema[] => {
	const constraints: RootSchema[] = []
	// draft-07 lists a tuple's elements as items, followed by additionalItems
	const elementsKey = isArray(o.items) ? "items" : "prefixItems"
	const restKey = elementsKey === "items" ? "additionalItems" : "items"
	const elements = readEach(
		(o[elementsKey] ?? []) as array,
		`${pointer}/${elementsKey}`,
		ctx
	)
	const rest = read(o[restKey] ?? true, `${pointer}/${restKey}`, ctx)
	if (elements.length === 0 && rest.isNever())
		constraints.push({ exactLength: 0 })
	else if (elements.length || !rest.isUnknown()) {
		constraints.push({
			sequence:
				rest.isNever() ?
					{ optionals: elements }
				:	{ optionals: elements, variadic: rest }
		})
	}
	if (o.minItems !== undefined)
		constraints.push({ minLength: o.minItems as number })
	if (o.maxItems !== undefined)
		constraints.push({ maxLength: o.maxItems as number })
	if (o.uniqueItems === true) {
		constraints.push({
			predicate: [
				opaque(["uniqueItems"], "an array of unique items", (data: array) =>
					data.every((item, i) =>
						data.slice(i + 1).every(other => !jsonEquals(item, other))
					)
				)
			]
		})
	}
	if (o.contains !== undefined) {
		const contained = read(o.contains, `${pointer}/contains`, ctx)
		const min = (o.minContains ?? 1) as number
		const max = (o.maxContains ?? Number.POSITIVE_INFINITY) as number
		constraints.push({
			predicate: [
				opaque(
					["contains", contained.id, min, max],
					`an array containing ${contained.description}`,
					(data: array) => {
						const count = data.filter(item => contained.allows(item)).length
						return count >= min && count <= max
					}
				)
			]
		})
	}
	return constraints
}

const readObject = (
	o: dict,
	pointer: string,
	ctx: ReadContext
): RootSchema[] => {
	const properties = (o.properties ?? {}) as dict
	const patternProperties = (o.patternProperties ?? {}) as dict
	const additional = read(
		o.additionalProperties ?? true,
		`${pointer}/additionalProperties`,
		ctx
	)
	const patterns = Object.keys(patternProperties).map(source => {
		const patternPointer = `${pointer}/patternProperties/${escapePointer(source)}`
		const schema = patternSchemaOf(source, patternPointer)
		return {
			schema,
			matcher: new RegExp(schema.rule, schema.flags),
			value: read(patternProperties[source], patternPointer, ctx)
		}
	})
	const isDeclared = (k: string) =>
		hasOwn(properties, k) || patterns.some(p => p.matcher.test(k))
	const required = (o.required ?? []) as string[]
	const structure = {
		required: [] as unknown[],
		optional: [] as unknown[],
		index: patterns.map(p => ({
			signature: { domain: "string", pattern: [p.schema] },
			value: p.value
		})) as unknown[],
		predicate: [] as unknown[],
		undeclared: undefined as "reject" | undefined
	}
	for (const key of new Set([...Object.keys(properties), ...required])) {
		// a declared key meets every pattern it matches, else additionalProperties
		const value = patterns
			.filter(p => p.matcher.test(key))
			.reduce(
				(result, p) => intersectRoots(result, p.value),
				hasOwn(properties, key) ?
					read(
						properties[key],
						`${pointer}/properties/${escapePointer(key)}`,
						ctx
					)
				: isDeclared(key) ? $ark.intrinsic.unknown
				: additional
			)
		if (!required.includes(key)) structure.optional.push({ key, value })
		else if (value.isNever()) return [$ark.intrinsic.never]
		else structure.required.push({ key, value })
	}
	if (additional.isNever()) structure.undeclared = "reject"
	else if (!additional.isUnknown()) {
		if (Object.keys(properties).length === 0 && patterns.length === 0)
			structure.index.push({ signature: "string", value: additional })
		else {
			structure.predicate.push(
				opaque(
					[
						"additionalProperties",
						additional.id,
						Object.keys(properties),
						patterns.map(p => p.schema)
					],
					`an object whose other properties are ${additional.description}`,
					(data: dict) =>
						Object.keys(data).every(
							k => isDeclared(k) || additional.allows(data[k])
						)
				)
			)
		}
	}
	if (o.propertyNames !== undefined) {
		const names = read(o.propertyNames, `${pointer}/propertyNames`, ctx)
		structure.predicate.push(
			opaque(
				["propertyNames", names.id],
				`an object whose keys are ${names.description}`,
				(data: dict) => Object.keys(data).every(k => names.allows(k))
			)
		)
	}
	if (o.minProperties !== undefined || o.maxProperties !== undefined) {
		const min = (o.minProperties ?? 0) as number
		const max = (o.maxProperties ?? Number.POSITIVE_INFINITY) as number
		structure.predicate.push(
			opaque(
				["properties", min, max],
				o.maxProperties === undefined ?
					`an object with at least ${min} properties`
				: o.minProperties === undefined ?
					`an object with at most ${max} properties`
				:	`an object with ${min} to ${max} properties`,
				(data: dict) => {
					const count = Object.keys(data).length
					return count >= min && count <= max
				}
			)
		)
	}
	for (const keyword of [
		"dependencies",
		"dependentRequired",
		"dependentSchemas"
	] as const) {
		const dependencies = o[keyword] as dict
		for (const key in dependencies) {
			const dependency = dependencies[key]
			if (isArray(dependency)) {
				structure.predicate.push(
					opaque(
						["dependentRequired", key, dependency],
						`an object with ${dependency.join(", ")} if it has ${key}`,
						(data: dict) =>
							!hasOwn(data, key) ||
							dependency.every(k => hasOwn(data, k as string))
					)
				)
			} else {
				const dependent = read(
					dependency,
					`${pointer}/${keyword}/${escapePointer(key)}`,
					ctx
				)
				structure.predicate.push(
					opaque(
						["dependentSchemas", key, dependent.id],
						`${dependent.description} if it has ${key}`,
						(data: dict) => !hasOwn(data, key) || dependent.allows(data)
					)
				)
			}
		}
	}
	return (
			structure.required.length ||
				structure.optional.length ||
				structure.index.length ||
				structure.predicate.length ||
				structure.undeclared
		) ?
			[structure as never]
		:	[]
}

type ConstrainedType = "number" | "string" | "array" | "object"

const constrainOwnType = (
	type: ConstrainedType,
	constraints: RootSchema[]
): BaseRoot | undefined =>
	constraints.length === 0 ?
		undefined
	:	unionOf([
			constraints.reduce<BaseRoot>(
				(result, constraint) =>
					intersectRoots(
						result,
						rootSchema(
							isNode(constraint) ? constraint : (
								{ ...basisOf[type], ...(constraint as object) }
							)
						)
					),
				typeRoots()[type]
			),
			unconstrainedBy()[type]
		])

const basisOf = {
	number: { domain: "number" },
	string: { domain: "string" },
	array: { proto: Array },
	object: { domain: "object" }
} as const

// pure, so a bundle with only the engine drops the reader
const notArray = /* @__PURE__ */ cached(() => {
	// installs the rule only once a node can carry it
	$ark.sets!.disjointOf = disjointFromArray
	return node("predicate", {
		predicate: isNonArray,
		meta: { description: "not an array" }
	})
})

// sound since an Array basis checks Array.isArray
const disjointFromArray = (node: BaseNode): Disjoint | undefined => {
	if (!node.hasKind("intersection")) return
	const { proto, predicate } = node.inner
	const nonArray = predicate?.find(node => node.predicate === isNonArray)
	return proto?.proto === Array && nonArray ?
			Disjoint.init("assignability", proto, nonArray.description)
		:	undefined
}

const typeRoots = /* @__PURE__ */ cached(
	(): Record<JsonSchema.TypeName, BaseRoot> => ({
		string: $ark.intrinsic.string,
		number: $ark.intrinsic.number,
		integer: $ark.intrinsic.integer,
		boolean: $ark.intrinsic.boolean,
		null: $ark.intrinsic.null,
		array: $ark.intrinsic.Array,
		object: rootSchema({ domain: "object", predicate: [notArray()] })
	})
)

const otherThan = (...branches: BaseRoot[]) =>
	unionOf([
		...branches,
		rootSchema(["bigint", "symbol", { unit: undefined }]),
		typeRoots().boolean,
		typeRoots().null
	])

// a type's keywords constrain only that type, e.g. { minimum: 5 } allows "foo"
const unconstrainedBy = /* @__PURE__ */ cached(
	(): Record<ConstrainedType, BaseRoot> => {
		const { number, string, array, object } = typeRoots()
		return {
			number: otherThan(string, array, object),
			string: otherThan(number, array, object),
			array: otherThan(number, string, object),
			object: otherThan(number, string, array)
		}
	}
)

const constRoot = (value: unknown): BaseRoot =>
	isArray(value) ?
		rootSchema(
			value.length === 0 ?
				{ proto: Array, exactLength: 0 }
			:	{ proto: Array, sequence: { prefix: value.map(constRoot) } }
		)
	: isPlainObject(value) ?
		rootSchema({
			domain: "object",
			predicate: [notArray()],
			required: Object.entries(value).map(([key, v]) => ({
				key,
				value: constRoot(v)
			})),
			undeclared: "reject"
		})
	:	rootSchema({ unit: value })

// one predicate per keyword and subschemas, so equal reads relate
const predicatesByKey: Record<string, Predicate> = {}

const opaque = (
	key: unknown[],
	description: string,
	predicate: Predicate<any>
): NodeSchema<"predicate"> => ({
	predicate: (predicatesByKey[JSON.stringify(key)] ??= predicate),
	meta: { description }
})

const opaqueRoot = (
	key: unknown[],
	description: string,
	predicate: Predicate
): BaseRoot => rootSchema({ predicate: [opaque(key, description, predicate)] })

const idsOf = (roots: readonly BaseRoot[]) => roots.map(root => root.id)

const readEach = (schemas: array, pointer: string, ctx: ReadContext) =>
	schemas.map((schema, i) => read(schema, `${pointer}/${i}`, ctx))

const unionOf = (roots: readonly BaseRoot[]): BaseRoot =>
	node("union", { branches: roots.flatMap(root => root.branches) })

const branchesAreDisjoint = (branches: BaseRoot[]) =>
	branches.every((l, i) =>
		branches
			.slice(i + 1)
			.every(r => intersectNodesRoot(l, r, rootSchemaScope) instanceof Disjoint)
	)

const withAnnotations = (root: BaseRoot, o: dict): BaseRoot => {
	const meta = flatMorph(annotationKeys, (i, k) =>
		o[k] === undefined ? [] : [k, o[k]]
	)
	return Object.keys(meta).length === 0 || root.hasKind("alias") ?
			root
		:	root.configure(meta as never, "self")
}

const annotationKeys = [
	"title",
	"description",
	"format",
	"deprecated",
	"default",
	"examples"
] as const

// ajv compiles a pattern with "u", which only these constructs read differently
const flagsOf = (source: string): "u" | undefined => {
	let inClass = false
	for (let i = 0; i < source.length; i++) {
		const char = source[i]
		if (char > "\x7f") return "u"
		if (char === "\\") {
			const escaped = source[++i]
			if (escaped > "\x7f" || "DPSWpu".includes(escaped)) return "u"
		} else if (inClass) inClass = char !== "]"
		else if (char === "[") {
			if (source[i + 1] === "^") return "u"
			inClass = true
		} else if (char === ".") return "u"
	}
}

const patternSchemaOf = (source: string, pointer: string) => {
	try {
		new RegExp(source, "u")
	} catch {
		return throwParseError(
			writeInvalidKeywordMessage(pointer, "a valid pattern", source)
		)
	}
	const flags = flagsOf(source)
	return flags ? { rule: source, flags } : { rule: source }
}

const jsonEquals = (l: unknown, r: unknown): boolean => {
	if (l === r) return true
	if (typeof l !== "object" || typeof r !== "object" || !l || !r) return false
	if (isArray(l) || isArray(r)) {
		return (
			isArray(l) &&
			isArray(r) &&
			l.length === r.length &&
			l.every((v, i) => jsonEquals(v, r[i]))
		)
	}
	const lKeys = Object.keys(l)
	return (
		lKeys.length === Object.keys(r).length &&
		lKeys.every(k => hasOwn(r, k) && jsonEquals((l as dict)[k], (r as dict)[k]))
	)
}

export const isPlainObject = (value: unknown): value is object => {
	if (typeof value !== "object" || value === null) return false
	const proto = Object.getPrototypeOf(value)
	return proto === Object.prototype || proto === null
}

const escapePointer = (key: string) =>
	key.replace(/~/g, "~0").replace(/\//g, "~1")

const isSchema = (v: unknown) => typeof v === "boolean" || isPlainObject(v)

const isEvery = (v: unknown, allows: (element: unknown) => boolean) =>
	isArray(v) && v.every(allows)

const isEveryValue = (v: unknown, allows: (value: unknown) => boolean) =>
	isPlainObject(v) && Object.values(v).every(allows)

const isString = (v: unknown) => typeof v === "string"

const isNumber = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v)

const typeNames: readonly unknown[] = [
	"string",
	"number",
	"integer",
	"boolean",
	"null",
	"array",
	"object"
] satisfies JsonSchema.TypeName[]

const keywordValues = {
	number: ["a number", isNumber],
	divisor: ["a positive number", v => isNumber(v) && v > 0],
	count: [
		"a non-negative integer",
		v => Number.isInteger(v) && (v as number) >= 0
	],
	string: ["a string", isString],
	strings: ["an array of strings", v => isEvery(v, isString)],
	keys: [
		"an array of unique strings",
		v =>
			isEvery(v, isString) && new Set(v as array).size === (v as array).length
	],
	boolean: ["a boolean", v => typeof v === "boolean"],
	array: ["an array", isArray],
	schema: ["a schema", isSchema],
	schemas: ["an array of schemas", v => isEvery(v, isSchema)],
	branches: [
		"a non-empty array of schemas",
		v => isEvery(v, isSchema) && (v as array).length > 0
	],
	items: [
		"a schema or an array of schemas",
		v => isSchema(v) || isEvery(v, isSchema)
	],
	schemasByKey: ["an object of schemas", v => isEveryValue(v, isSchema)],
	stringsByKey: [
		"an object of string arrays",
		v => isEveryValue(v, v => isEvery(v, isString))
	],
	dependencies: [
		"an object of schemas or string arrays",
		v => isEveryValue(v, v => isSchema(v) || isEvery(v, isString))
	],
	type: [
		"a type name or an array of type names",
		v => isEvery(isArray(v) ? v : [v], name => typeNames.includes(name))
	]
} satisfies Record<string, [expected: string, allows: (v: unknown) => boolean]>

const keywordValueKinds: Record<string, keyof typeof keywordValues> = {
	$ref: "string",
	type: "type",
	enum: "array",
	minimum: "number",
	exclusiveMinimum: "number",
	maximum: "number",
	exclusiveMaximum: "number",
	multipleOf: "divisor",
	minLength: "count",
	maxLength: "count",
	pattern: "string",
	format: "string",
	prefixItems: "schemas",
	items: "items",
	additionalItems: "schema",
	minItems: "count",
	maxItems: "count",
	uniqueItems: "boolean",
	contains: "schema",
	minContains: "count",
	maxContains: "count",
	properties: "schemasByKey",
	required: "keys",
	patternProperties: "schemasByKey",
	additionalProperties: "schema",
	propertyNames: "schema",
	minProperties: "count",
	maxProperties: "count",
	dependentRequired: "stringsByKey",
	dependentSchemas: "schemasByKey",
	dependencies: "dependencies",
	allOf: "branches",
	anyOf: "branches",
	oneOf: "branches",
	not: "schema",
	if: "schema",
	then: "schema",
	else: "schema"
}

const unsupportedKeywords = [
	"$dynamicRef",
	"$recursiveRef",
	"unevaluatedItems",
	"unevaluatedProperties"
]

const checkKeyword = (o: dict, k: string, pointer: string): void => {
	if (unsupportedKeywords.includes(k))
		throwParseError(writeUnsupportedKeywordMessage(`${pointer}/${k}`))
	if (!hasOwn(keywordValueKinds, k)) return
	const [expected, allows] = keywordValues[keywordValueKinds[k]]
	if (!(allows as (v: unknown) => boolean)(o[k])) {
		throwParseError(
			writeInvalidKeywordMessage(`${pointer}/${k}`, expected, o[k])
		)
	}
}

export const writeUnparsableSchemaMessage = (actual: string): string =>
	`Schema must be a Root, a Standard JSON Schema or a JSON Schema (was ${actual})`

export const writeInvalidJsonSchemaMessage = (
	pointer: string,
	actual: unknown
): string =>
	`JSON Schema at ${pointer} must be an object or a boolean (was ${printable(actual)})`

export const writeInvalidKeywordMessage = (
	pointer: string,
	expected: string,
	actual: unknown
): string => `${pointer} must be ${expected} (was ${printable(actual)})`

export const writeUnsupportedKeywordMessage = (pointer: string): string =>
	`${pointer} can't be read as a set of values`

export const writeUnsupportedRefMessage = (
	ref: string,
	pointer: string
): string =>
	`${pointer} must be a JSON Pointer into its document like #/$defs/name, outside any nested $id (was ${ref})`

export const writeUnresolvableRefMessage = (ref: string): string =>
	`$ref ${ref} doesn't resolve to a schema in its document`

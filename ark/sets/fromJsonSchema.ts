import {
	$ark,
	Disjoint,
	defining,
	isNode,
	schemaScope,
	type BaseNode,
	type BaseParseContext,
	type BaseRoot,
	type BaseScope,
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
	WeakCache,
	type array,
	type dict
} from "@ark/util"
// installs the engine, which reduces nodes as they're parsed
import "./engine.ts"
import { intersectNodesRoot } from "./intersections.ts"
import { isNonArray } from "./toJsonSchema.ts"

interface ReadContext {
	document: unknown
	// draft-07 and earlier ignore the keywords beside a $ref, and have none of
	// the 2019-09 keywords arksets can't read
	dialectBefore2019: boolean
	// draft-04 identifies a resource with `id`
	idKey: "$id" | "id"
	documentResource: Resource
	// the resource whose base URI a $ref resolves against
	resource: Resource
	// indexed the first time a $ref isn't a JSON Pointer
	resourcesByUri: Record<string, Resource> | undefined
	rootsByRef: Record<string, BaseRoot>
	refsBeingRead: string[]
	// refs entered since descending into a child value, to reject shallow
	// cycles through combinators/predicates (anyOf/oneOf/not/if/dependentSchemas)
	shallowRefs: Set<string>
	inPredicate: number
	// JS object stack within the current $ref frame, to reject circular objects
	reading: Set<object>
	depth: number
	// a cyclic ref is named by its target, so it prints alike in any history
	cyclesByRef: Record<string, BaseParseContext>
}

interface Resource {
	schema: unknown
	uri: string
}

// what a JSON Schema accepts can't depend on configure(). The scope pins the
// option it can, and the nodes written here state the global-only ones
// (onUndeclaredKey, numberAllowsNaN, numberAllowsInfinity) themselves: a scope
// can't set those, and a node rebuilt in another scope, e.g. by an
// intersection with an arktype Type, would otherwise take that scope's
const jsonSchemaScope = /* @__PURE__ */ cached((): BaseScope => {
	const $ = schemaScope(
		{},
		{ name: "jsonSchema", exactOptionalPropertyTypes: true }
	)
	$.export()
	return $
})

const jsonSchemaRoot = (schema: RootSchema): BaseRoot =>
	jsonSchemaScope().schema(schema)

const jsonSchemaNode: BaseScope["node"] = (kind, schema, opts) =>
	jsonSchemaScope().node(kind, schema, opts)

// a number JSON Schema reads is finite, whatever configure() says
const numberDomain = {
	domain: "number",
	numberAllowsNaN: false,
	numberAllowsInfinity: false
} as const

// deep enough for real schemas (100-200+ levels) without risking a JS stack overflow
const maxReadDepth = 512
const maxValueDepth = 1024

export const readJsonSchema = (
	schema: JsonSchema.Input,
	document: JsonSchema.Input = schema
): BaseRoot => {
	const $schema = String(
		isJsonSchemaObject(document) && (document as dict).$schema
	)
	const documentResource = { schema: document, uri: documentUri }
	const ctx: ReadContext = {
		document,
		dialectBefore2019: /draft-0[3-7]/.test($schema),
		idKey: /draft-0[34]/.test($schema) ? "id" : "$id",
		documentResource,
		resource: documentResource,
		resourcesByUri: undefined,
		rootsByRef: {},
		refsBeingRead: [],
		shallowRefs: new Set(),
		inPredicate: 0,
		reading: new Set(),
		depth: 0,
		cyclesByRef: {}
	}
	const id = idOf(document, ctx)
	if (id !== undefined) documentResource.uri = resolveUri(id, documentUri, "#")
	try {
		return jsonSchemaScope().fin(defining(() => read(schema, "#", ctx)))
	} finally {
		for (const ref in ctx.cyclesByRef)
			delete $ark.nodesById[ctx.cyclesByRef[ref].id]
	}
}

const read = (schema: unknown, pointer: string, ctx: ReadContext): BaseRoot => {
	if (typeof schema === "boolean")
		return schema ? $ark.kw.unknown : $ark.kw.never
	if (!isJsonSchemaObject(schema))
		return throwParseError(writeInvalidJsonSchemaMessage(pointer, schema))
	if (ctx.depth >= maxReadDepth)
		return throwParseError(writeMaxDepthMessage(pointer))
	if (ctx.reading.has(schema))
		return throwParseError(writeCircularSchemaMessage(pointer))
	ctx.reading.add(schema)
	ctx.depth++
	const enclosing = ctx.resource
	try {
		const o = schema as dict
		for (const k in o) checkKeyword(o, k, pointer, ctx)
		if (o.$ref !== undefined && ctx.dialectBefore2019)
			return readRef(o.$ref as string, pointer, ctx)
		const id = schema === enclosing.schema ? undefined : idOf(o, ctx)
		if (id !== undefined) {
			ctx.resource = {
				schema,
				uri: resolveUri(id, enclosing.uri, `${pointer}/${ctx.idKey}`)
			}
		}
		let result = $ark.kw.unknown
		for (const readKeywords of keywordReaders) {
			const constraint = readKeywords(o, pointer, ctx)
			if (constraint) result = intersectRoots(result, constraint)
		}
		return withAnnotations(result, o, pointer)
	} finally {
		ctx.resource = enclosing
		ctx.depth--
		ctx.reading.delete(schema)
	}
}

type KeywordReader = (
	o: dict,
	pointer: string,
	ctx: ReadContext
) => BaseRoot | undefined

const readRef = (ref: string, pointer: string, ctx: ReadContext): BaseRoot => {
	const target = resolveRef(ref, pointer, ctx)
	// refs within the document's own resource are keyed as written
	const key =
		target.resource.uri === documentUri ?
			`#${target.fragment}`
		:	`${target.resource.uri}#${target.fragment}`
	if (hasOwn(ctx.rootsByRef, key)) return ctx.rootsByRef[key]
	// a ref within its own target is a cycle, resolved once that's read
	if (ctx.refsBeingRead.includes(key)) {
		if (ctx.inPredicate > 0 && ctx.shallowRefs.has(key))
			return throwParseError(writeShallowCycleMessage(ref, pointer))
		ctx.cyclesByRef[key] ??= jsonSchemaScope().openSynthetic(
			`synthetic${hashOf(`${key}\n${printable(target.schema)}`)}`
		)
		return jsonSchemaScope().lazilyResolve(
			() => ctx.rootsByRef[key],
			ctx.cyclesByRef[key].id
		)
	}
	const enclosing = ctx.resource
	const prevReading = ctx.reading
	const hadShallow = ctx.shallowRefs.has(key)
	ctx.resource = target.resource
	ctx.reading = new Set()
	ctx.refsBeingRead.push(key)
	ctx.shallowRefs.add(key)
	try {
		const root = read(target.schema, ref, ctx)
		return (ctx.rootsByRef[key] = root)
	} finally {
		if (!hadShallow) ctx.shallowRefs.delete(key)
		ctx.refsBeingRead.pop()
		ctx.reading = prevReading
		ctx.resource = enclosing
	}
}

const withShallowPredicate = <t>(ctx: ReadContext, read: () => t): t => {
	ctx.inPredicate++
	try {
		return read()
	} finally {
		ctx.inPredicate--
	}
}

const withChildValue = <t>(ctx: ReadContext, read: () => t): t => {
	const prevShallowRefs = ctx.shallowRefs
	const prevInPredicate = ctx.inPredicate
	ctx.shallowRefs = new Set()
	ctx.inPredicate = 0
	try {
		return read()
	} finally {
		ctx.shallowRefs = prevShallowRefs
		ctx.inPredicate = prevInPredicate
	}
}

interface RefTarget {
	schema: unknown
	// the resource enclosing the target, against which its own refs resolve
	resource: Resource
	fragment: string
}

const resolveRef = (
	ref: string,
	pointer: string,
	ctx: ReadContext
): RefTarget => {
	if (ref === "#" || ref.startsWith("#/"))
		return resolvePointer(ref, ref.slice(1), ctx.resource, ctx)
	ctx.resourcesByUri ??= indexResources(ctx)
	let uri: URL
	try {
		uri = new URL(ref, ctx.resource.uri)
	} catch {
		return throwParseError(writeUnresolvableRefMessage(ref))
	}
	const fragment = uri.hash.slice(1)
	uri.hash = ""
	const resource = ctx.resourcesByUri[uri.href]
	if (!resource)
		return throwParseError(writeUnsupportedRefMessage(ref, `${pointer}/$ref`))
	if (fragment === "" || fragment[0] === "/")
		return resolvePointer(ref, fragment, resource, ctx)
	const anchored = ctx.resourcesByUri[`${uri.href}#${fragment}`]
	return anchored ?
			{ schema: anchored.schema, resource, fragment }
		:	throwParseError(writeUnresolvableRefMessage(ref))
}

// segments are percent-decoded, then unescaped (RFC 6901)
const resolvePointer = (
	ref: string,
	fragment: string,
	from: Resource,
	ctx: ReadContext
): RefTarget => {
	let resource = from
	const target = fragment
		.split("/")
		.slice(1)
		.reduce((target, segment) => {
			if (target !== resource.schema) {
				const id = idOf(target, ctx)
				if (id !== undefined)
					resource = { schema: target, uri: resolveUri(id, resource.uri, ref) }
			}
			const key = decodePointerSegment(segment, ref)
			return (
					typeof target === "object" && target !== null && hasOwn(target, key)
				) ?
					(target as dict)[key]
				:	throwParseError(writeUnresolvableRefMessage(ref))
		}, from.schema)
	return { schema: target, resource, fragment }
}

const decodePointerSegment = (segment: string, ref: string): string => {
	let decoded: string
	try {
		decoded = decodeURIComponent(segment)
	} catch {
		// a malformed escape like %ZZ names no key
		return throwParseError(writeUnresolvableRefMessage(ref))
	}
	return decoded.replace(/~1/g, "/").replace(/~0/g, "~")
}

// the base URI of a document without an absolute $id
const documentUri = "arksets:/document"

// the $id that starts a new resource. One that's only a fragment is an anchor.
const idOf = (schema: unknown, ctx: ReadContext): string | undefined => {
	if (!isJsonSchemaObject(schema)) return
	const o = schema as dict
	if (o.$ref !== undefined && ctx.dialectBefore2019) return
	const id = o[ctx.idKey]
	return typeof id === "string" && id[0] !== "#" ? id : undefined
}

const resolveUri = (id: string, base: string, pointer: string): string =>
	uriOf(id, base) ??
	throwParseError(writeInvalidKeywordMessage(pointer, "a URI reference", id))

const uriOf = (id: string, base: string): string | undefined => {
	try {
		const uri = new URL(id, base)
		uri.hash = ""
		return uri.href
	} catch {
		return
	}
}

// every resource by its URI, and every anchored schema by its resource's URI and anchor
const indexResources = (ctx: ReadContext): Record<string, Resource> => {
	const resourcesByUri: Record<string, Resource> = {
		[ctx.documentResource.uri]: ctx.documentResource
	}
	const visited = new Set<unknown>()
	const visit = (
		schema: unknown,
		enclosing: Resource,
		pointer: string,
		depth: number
	): void => {
		if (!isJsonSchemaObject(schema) || visited.has(schema)) return
		if (depth >= maxReadDepth) throwParseError(writeMaxDepthMessage(pointer))
		visited.add(schema)
		const o = schema as dict
		const id = schema === ctx.document ? undefined : idOf(o, ctx)
		// an invalid $id throws where it's read
		const uri = id === undefined ? undefined : uriOf(id, enclosing.uri)
		const resource = uri === undefined ? enclosing : { schema, uri }
		if (uri !== undefined) resourcesByUri[uri] = resource
		for (const anchor of anchorsOf(o, ctx)) {
			resourcesByUri[`${resource.uri}#${anchor}`] = {
				schema,
				uri: resource.uri
			}
		}
		// a keyword's value is checked only where it's read, so one here may be invalid
		for (const k in o) {
			const kind = keywordValueKinds[k]
			const keyPointer = `${pointer}/${escapePointer(k)}`
			if (kind === "schema") visit(o[k], resource, keyPointer, depth + 1)
			else if (kind === "items" || kind === "schemas" || kind === "branches") {
				if (isArray(o[k])) {
					for (let i = 0; i < o[k].length; i++)
						visit(o[k][i], resource, `${keyPointer}/${i}`, depth + 1)
				} else visit(o[k], resource, keyPointer, depth + 1)
			} else if (
				(kind === "schemasByKey" || kind === "dependencies") &&
				isJsonSchemaObject(o[k])
			) {
				for (const [subKey, v] of Object.entries(o[k])) {
					visit(
						v,
						resource,
						`${keyPointer}/${escapePointer(subKey)}`,
						depth + 1
					)
				}
			}
		}
		// an OpenAPI document's schemas
		if (schema === ctx.document && isJsonSchemaObject(o.components)) {
			const { schemas } = o.components as dict
			if (isJsonSchemaObject(schemas)) {
				for (const [subKey, v] of Object.entries(schemas)) {
					visit(
						v,
						resource,
						`${pointer}/components/schemas/${escapePointer(subKey)}`,
						depth + 1
					)
				}
			}
		}
	}
	visit(ctx.document, ctx.documentResource, "#", 0)
	return resourcesByUri
}

// before 2019-09, an anchor is an id that's only a fragment
const anchorsOf = (o: dict, ctx: ReadContext): string[] => {
	if (o.$ref !== undefined && ctx.dialectBefore2019) return []
	const id = o[ctx.idKey]
	return [
		o.$anchor,
		o.$dynamicAnchor,
		typeof id === "string" && id[0] === "#" ? id.slice(1) : undefined
	].filter((anchor): anchor is string => typeof anchor === "string" && !!anchor)
}

// OpenAPI 3.0's nullable adds null to the type beside it, as ajv reads it: the
// schema's other keywords still apply, so an enum or const without null, or
// a subschema with a type of its own, still excludes it
const typeNamesOf = (o: dict): array => {
	const names = isArray(o.type) ? o.type : [o.type]
	return o.nullable === true && !names.includes("null") ?
			[...names, "null"]
		:	names
}

const intersectRoots = (l: BaseRoot, r: BaseRoot): BaseRoot =>
	intersectNodesRoot(l, r, jsonSchemaScope()).toNeverIfDisjoint()

const keywordReaders: KeywordReader[] = [
	(o, pointer, ctx) =>
		o.$ref === undefined ? undefined : readRef(o.$ref as string, pointer, ctx),
	o =>
		o.type === undefined ?
			undefined
		:	unionOf(
				typeNamesOf(o).map(name => typeRoots()[name as JsonSchema.TypeName])
			),
	(o, pointer) =>
		o.const === undefined ? undefined : constRoot(o.const, `${pointer}/const`),
	(o, pointer) => {
		if (o.enum === undefined) return
		const items = o.enum as array
		const seen = new Set<object>([items])
		return unionOf(
			items.map((v, i) => constRoot(v, `${pointer}/enum/${i}`, 0, seen))
		)
	},
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
								isDecimalMultipleOf(divisor)
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
				pattern: [
					o.pattern instanceof RegExp ?
						o.pattern
					:	patternSchemaOf(o.pattern as string, `${pointer}/pattern`)
				]
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
				$ark.kw.unknown
			),
	(o, pointer, ctx) =>
		o.anyOf === undefined ?
			undefined
		:	unionOf(
				withShallowPredicate(ctx, () =>
					readEach(o.anyOf as array, `${pointer}/anyOf`, ctx)
				)
			),
	(o, pointer, ctx) => {
		if (o.oneOf === undefined) return
		const branches = withShallowPredicate(ctx, () =>
			readEach(o.oneOf as array, `${pointer}/oneOf`, ctx)
		)
		return branchesAreDisjoint(branches) ?
				unionOf(branches)
			:	opaqueRoot(
					["oneOf", idsOf(branches)],
					`exactly one of ${branches.map(expectedOf).join(", ")}`,
					data => branches.filter(branch => branch.allows(data)).length === 1
				)
	},
	(o, pointer, ctx) => {
		if (o.not === undefined) return
		const negated = withShallowPredicate(ctx, () =>
			read(o.not, `${pointer}/not`, ctx)
		)
		// { not: {} } is how never is written, so it's read back as never
		if (negated.isUnknown()) return $ark.kw.never
		return opaqueRoot(
			["not", negated.id],
			`other than ${expectedOf(negated)}`,
			data => !negated.allows(data)
		)
	},
	(o, pointer, ctx) => {
		if (o.if === undefined || (o.then === undefined && o.else === undefined))
			return
		const [condition, consequent, alternative] = withShallowPredicate(
			ctx,
			() => [
				read(o.if, `${pointer}/if`, ctx),
				read(o.then ?? true, `${pointer}/then`, ctx),
				read(o.else ?? true, `${pointer}/else`, ctx)
			]
		)
		return opaqueRoot(
			["if", idsOf([condition, consequent, alternative])],
			`${expectedOf(consequent)} if ${expectedOf(condition)}, else ${expectedOf(alternative)}`,
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
	const [elements, rest] = withChildValue(ctx, () => [
		readEach((o[elementsKey] ?? []) as array, `${pointer}/${elementsKey}`, ctx),
		read(o[restKey] ?? true, `${pointer}/${restKey}`, ctx)
	])
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
				opaque(["uniqueItems"], "an array of unique items", hasUniqueItems)
			]
		})
	}
	const min = (o.minContains ?? 1) as number
	const max = (o.maxContains ?? Number.POSITIVE_INFINITY) as number
	// any array has at least 0 items that are anything, so that relates as Array
	if (
		o.contains !== undefined &&
		(min !== 0 || max !== Number.POSITIVE_INFINITY)
	) {
		const contained = withChildValue(ctx, () =>
			read(o.contains, `${pointer}/contains`, ctx)
		)
		constraints.push({
			predicate: [
				opaque(
					["contains", contained.id, min, max],
					min === 1 && max === Number.POSITIVE_INFINITY ?
						`an array containing ${expectedOf(contained)}`
					:	`an array with ${describeCount(min, max, "item that is", "items that are")} ${expectedOf(contained)}`,
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
	const additional = withChildValue(ctx, () =>
		read(o.additionalProperties ?? true, `${pointer}/additionalProperties`, ctx)
	)
	const patterns = Object.keys(patternProperties).map(source => {
		const patternPointer = `${pointer}/patternProperties/${escapePointer(source)}`
		const schema = patternSchemaOf(source, patternPointer)
		return {
			schema,
			matcher: new RegExp(schema.rule, schema.flags),
			value: withChildValue(ctx, () =>
				read(patternProperties[source], patternPointer, ctx)
			)
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
		// stated, so configure({ onUndeclaredKey }) can't change it
		undeclared: (additional.isNever() ? "reject" : "ignore") as
			| "reject"
			| "ignore",
		// as properties lists them
		order: [] as string[]
	}
	for (const key of new Set([...Object.keys(properties), ...required])) {
		// a declared key meets every pattern it matches, else additionalProperties
		const value = patterns
			.filter(p => p.matcher.test(key))
			.reduce(
				(result, p) => intersectRoots(result, p.value),
				hasOwn(properties, key) ?
					withChildValue(ctx, () =>
						read(
							properties[key],
							`${pointer}/properties/${escapePointer(key)}`,
							ctx
						)
					)
				: isDeclared(key) ? $ark.kw.unknown
				: additional
			)
		const isRequired = required.includes(key)
		if (isRequired && value.isNever()) return [$ark.kw.never]
		// a JSON object's properties are its own, but a prop finds a key like
		// toString on Object.prototype. An index signature reads only own keys,
		// and a required one is also checked to be own
		if (key in Object.prototype) {
			addPrototypeKeyConstraint(structure, key, value, isRequired)
			continue
		}
		structure.order.push(key)
		if (isRequired) structure.required.push({ key, value })
		else structure.optional.push({ key, value })
	}
	if (!additional.isNever() && !additional.isUnknown()) {
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
					`an object whose other properties are ${expectedOf(additional)}`,
					(data: dict) =>
						Object.keys(data).every(
							k => isDeclared(k) || additional.allows(data[k])
						)
				)
			)
		}
	}
	structure.predicate.push(...readKeyPredicates(o, pointer, ctx))
	return (
			structure.required.length ||
				structure.optional.length ||
				structure.index.length ||
				structure.predicate.length ||
				structure.undeclared === "reject"
		) ?
			[structure as never]
		:	[]
}

// the keywords constraining an object's keys as a whole. One every object
// meets adds no predicate, which would keep it from relating to one without
const readKeyPredicates = (
	o: dict,
	pointer: string,
	ctx: ReadContext
): NodeSchema<"predicate">[] => {
	const predicates: NodeSchema<"predicate">[] = []
	if (o.propertyNames !== undefined) {
		const names = withChildValue(ctx, () =>
			read(o.propertyNames, `${pointer}/propertyNames`, ctx)
		)
		if (!$ark.kw.string.extends(names)) {
			predicates.push(
				opaque(
					["propertyNames", names.id],
					`an object whose keys are ${expectedOf(names)}`,
					(data: dict) => Object.keys(data).every(k => names.allows(k))
				)
			)
		}
	}
	const min = (o.minProperties ?? 0) as number
	const max = (o.maxProperties ?? Number.POSITIVE_INFINITY) as number
	if (min !== 0 || max !== Number.POSITIVE_INFINITY) {
		predicates.push(
			opaque(
				["properties", min, max],
				`an object with ${describeCount(min, max, "property", "properties")}`,
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
				if (dependency.length === 0) continue
				predicates.push(
					opaque(
						["dependentRequired", key, dependency],
						`an object with ${dependency.join(", ")} if it has ${key}`,
						(data: dict) =>
							!hasOwn(data, key) ||
							dependency.every(k => hasOwn(data, k as string))
					)
				)
			} else {
				const dependent = withShallowPredicate(ctx, () =>
					read(dependency, `${pointer}/${keyword}/${escapePointer(key)}`, ctx)
				)
				if (dependent.isUnknown()) continue
				predicates.push(
					opaque(
						["dependentSchemas", key, dependent.id],
						`${expectedOf(dependent)} if it has ${key}`,
						(data: dict) => !hasOwn(data, key) || dependent.allows(data)
					)
				)
			}
		}
	}
	return predicates
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
						jsonSchemaRoot(
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
	number: { domain: numberDomain },
	string: { domain: "string" },
	array: { proto: Array },
	object: { domain: "object" }
} as const

// pure, so a bundle with only the engine drops the reader
const notArray = /* @__PURE__ */ cached(() => {
	// installs the rule only once a node can carry it
	$ark.sets!.disjointOf = disjointFromArray
	return jsonSchemaNode("predicate", {
		predicate: isNonArray,
		meta: { description: "not an array" }
	})
})

// sound since an Array basis checks Array.isArray
const disjointFromArray = (node: BaseNode): Disjoint | undefined => {
	if (!node.is("intersection")) return
	const { proto, predicate } = node.inner
	const nonArray = predicate?.find(node => node.predicate === isNonArray)
	return proto?.proto === Array && nonArray ?
			Disjoint.init("assignability", proto, nonArray.description)
		:	undefined
}

const typeRoots = /* @__PURE__ */ cached(
	(): Record<JsonSchema.TypeName, BaseRoot> => ({
		string: $ark.kw.string,
		number: jsonSchemaRoot(numberDomain),
		integer: jsonSchemaRoot({ domain: numberDomain, divisor: 1 }),
		boolean: $ark.kw.boolean,
		null: $ark.kw.null,
		array: $ark.kw.Array,
		object: jsonSchemaRoot({ domain: "object", predicate: [notArray()] })
	})
)

const otherThan = (...branches: BaseRoot[]) =>
	unionOf([
		...branches,
		jsonSchemaRoot(["bigint", "symbol", { unit: undefined }]),
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

type PrototypeKeyTarget = {
	index: unknown[]
	predicate: unknown[]
}

const addPrototypeKeyConstraint = (
	target: PrototypeKeyTarget,
	key: string,
	value: BaseRoot,
	isRequired: boolean
): void => {
	target.index.push({
		signature: {
			domain: "string",
			pattern: [{ rule: `^${escapeRegex(key)}$` }]
		},
		value
	})
	if (isRequired) {
		target.predicate.push(
			opaque(["ownKey", key], `an object with its own ${key}`, (data: dict) =>
				hasOwn(data, key)
			)
		)
	}
}

const decimalParts = (n: number): [coeff: bigint, exp: number] => {
	const s = `${n}`
	const eIndex = s.indexOf("e")
	const mantissa = eIndex === -1 ? s : s.slice(0, eIndex)
	let exp = eIndex === -1 ? 0 : Number(s.slice(eIndex + 1))
	const dot = mantissa.indexOf(".")
	if (dot !== -1) {
		exp -= mantissa.length - dot - 1
		return [BigInt(mantissa.slice(0, dot) + mantissa.slice(dot + 1)), exp]
	}
	return [BigInt(mantissa), exp]
}

// exact decimal divisibility so 0.3 / 0.1 and 1e308 / 0.5 behave without float drift
const isDecimalMultipleOf = (divisor: number): ((data: number) => boolean) => {
	const [sCoeff, sExp] = decimalParts(divisor)
	return (data: number) => {
		if (data === 0) return true
		if (!Number.isFinite(data)) return false
		const [dCoeff, dExp] = decimalParts(data)
		const expDiff = dExp - sExp
		if (expDiff >= 0) {
			if (sCoeff === 1n) return true
			return (dCoeff * 10n ** BigInt(expDiff)) % sCoeff === 0n
		}
		// Number.prototype.toString produces at most 21 significant digits
		if (expDiff < -21) return false
		return dCoeff % (sCoeff * 10n ** BigInt(-expDiff)) === 0n
	}
}

type RequiredPropEntry = {
	key: string
	value: BaseRoot
}

const constObjectRoot = (
	value: object,
	pointer: string,
	depth: number,
	seen: Set<object>
): BaseRoot => {
	const required: RequiredPropEntry[] = []
	const index: unknown[] = []
	const predicate: unknown[] = [notArray()]
	for (const [key, v] of Object.entries(value)) {
		const propValue = constRoot(
			v,
			`${pointer}/${escapePointer(key)}`,
			depth,
			seen
		)
		if (key in Object.prototype)
			addPrototypeKeyConstraint({ index, predicate }, key, propValue, true)
		else required.push({ key, value: propValue })
	}
	return jsonSchemaRoot({
		domain: "object",
		predicate,
		required,
		...(index.length && { index }),
		undeclared: "reject"
	} as never)
}

const constRoot = (
	value: unknown,
	pointer: string,
	depth = 0,
	seen: Set<object> = new Set()
): BaseRoot => {
	const isArr = isArray(value)
	if (!isArr && !isJsonSchemaObject(value))
		return jsonSchemaRoot({ unit: value })
	if (depth >= maxValueDepth)
		return throwParseError(writeMaxDepthMessage(pointer, maxValueDepth))
	if (seen.has(value))
		return throwParseError(writeCircularSchemaMessage(pointer))
	seen.add(value)
	try {
		return isArr ?
				jsonSchemaRoot(
					value.length === 0 ?
						{ proto: Array, exactLength: 0 }
					:	{
							proto: Array,
							sequence: {
								prefix: value.map((v, i) =>
									constRoot(v, `${pointer}/${i}`, depth + 1, seen)
								)
							}
						}
				)
			:	constObjectRoot(value, pointer, depth + 1, seen)
	} finally {
		seen.delete(value)
	}
}

// one predicate per keyword and subschemas, so equal reads relate
const predicatesByKey = /* @__PURE__ */ new WeakCache<Predicate>()

const opaque = (
	key: unknown[],
	description: string,
	predicate: Predicate<any>
): NodeSchema<"predicate"> => {
	const cacheKey = JSON.stringify(key)
	return {
		predicate:
			predicatesByKey.get(cacheKey) ?? predicatesByKey.set(cacheKey, predicate),
		meta: { description }
	}
}

const opaqueRoot = (
	key: unknown[],
	description: string,
	predicate: Predicate
): BaseRoot =>
	jsonSchemaRoot({ predicate: [opaque(key, description, predicate)] })

const idsOf = (roots: readonly BaseRoot[]) => roots.map(root => root.id)

// e.g. "at least 1 property" or "exactly 2 items that are"
const describeCount = (
	min: number,
	max: number,
	one: string,
	many: string
): string => {
	const range =
		max === Number.POSITIVE_INFINITY ? `at least ${min}`
		: min === max ? `exactly ${min}`
		: min === 0 ? `at most ${max}`
		: `${min} to ${max}`
	const count = max === Number.POSITIVE_INFINITY ? min : max
	return `${range} ${count === 1 ? one : many}`
}

const readEach = (schemas: array, pointer: string, ctx: ReadContext) =>
	schemas.map((schema, i) => read(schema, `${pointer}/${i}`, ctx))

const unionOf = (roots: readonly BaseRoot[]): BaseRoot =>
	jsonSchemaNode("union", { branches: roots.flatMap(root => root.branches) })

const branchesAreDisjoint = (branches: BaseRoot[]) =>
	branches.every((l, i) =>
		branches
			.slice(i + 1)
			.every(
				r => intersectNodesRoot(l, r, jsonSchemaScope()) instanceof Disjoint
			)
	)

const expectedOf = (root: BaseRoot): string =>
	typeof root.meta.expected === "string" ? root.meta.expected : root.description

const checkAnnotationValue = (
	value: unknown,
	pointer: string,
	depth = 0,
	seen: Set<object> = new Set()
): void => {
	if (typeof value !== "object" || value === null) return
	if (depth >= maxValueDepth)
		throwParseError(writeMaxDepthMessage(pointer, maxValueDepth))
	if (seen.has(value)) throwParseError(writeCircularSchemaMessage(pointer))
	seen.add(value)
	try {
		if (isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				if (i in value)
					checkAnnotationValue(value[i], `${pointer}/${i}`, depth + 1, seen)
			}
		} else {
			for (const [key, v] of Object.entries(value)) {
				checkAnnotationValue(
					v,
					`${pointer}/${escapePointer(key)}`,
					depth + 1,
					seen
				)
			}
		}
	} finally {
		seen.delete(value)
	}
}

const withAnnotations = (
	root: BaseRoot,
	o: dict,
	pointer: string
): BaseRoot => {
	if (o.default !== undefined)
		checkAnnotationValue(o.default, `${pointer}/default`)
	if (o.examples !== undefined)
		checkAnnotationValue(o.examples, `${pointer}/examples`)
	const meta: dict = flatMorph(annotationKeys, (i, k) =>
		o[k] === undefined ? [] : [k, o[k]]
	)
	if (Object.keys(meta).length === 0 || root.is("alias")) return root
	// a JSON Schema description is documentation, not an error expectation;
	// keep the structural description as `expected` so errors still name the
	// expected type while `.description` and `toJsonSchema()` preserve it
	if (typeof meta.description === "string") meta.expected = expectedOf(root)
	return root.configure(meta as never, "self")
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

type KeyBudget = {
	remaining: number
}

const canonicalJsonKey = (
	value: unknown,
	seen: Set<object>,
	budget: KeyBudget
): string => {
	if (value === null) return "null"
	switch (typeof value) {
		case "string":
			return JSON.stringify(value)
		case "number":
			return `${value}`
		case "boolean":
			return value ? "true" : "false"
		case "bigint":
			return `${value}n`
		case "undefined":
			return "undefined"
		case "object": {
			if (budget.remaining <= 0) return "..."
			if (seen.has(value)) return "@"
			budget.remaining--
			seen.add(value)
			try {
				if (isArray(value)) {
					const parts: string[] = []
					for (let i = 0; i < value.length; i++) {
						if (budget.remaining <= 0) {
							parts.push(`...(${value.length})`)
							break
						}
						budget.remaining--
						parts.push(canonicalJsonKey(value[i], seen, budget))
					}
					return `[${parts.join(",")}]`
				}
				const keys = Object.keys(value).sort()
				const parts: string[] = []
				for (let i = 0; i < keys.length; i++) {
					if (budget.remaining <= 0) {
						parts.push(`...(${keys.length})`)
						break
					}
					budget.remaining--
					const k = keys[i]
					parts.push(
						`${JSON.stringify(k)}:${canonicalJsonKey((value as dict)[k], seen, budget)}`
					)
				}
				return `{${parts.join(",")}}`
			} finally {
				seen.delete(value)
			}
		}
		default:
			return "?"
	}
}

// O(n) expected: primitives go through a Set (SameValueZero treats -0 and 0
// as equal per JSON Schema; NaN is skipped to match jsonEquals), while objects
// and arrays bucket by canonical sorted-key serialization and verify exact
// jsonEquals within each bucket
const hasUniqueItems = (data: array): boolean => {
	if (data.length <= 1) return true
	let primitives: Set<unknown> | undefined
	let objects: Map<string, unknown[]> | undefined
	let seen: Set<object> | undefined
	for (let i = 0; i < data.length; i++) {
		const item = data[i]
		if (typeof item !== "object" || item === null) {
			if (typeof item === "number" && Number.isNaN(item)) continue
			primitives ??= new Set()
			if (primitives.has(item)) return false
			primitives.add(item)
		} else {
			seen ??= new Set()
			const key = canonicalJsonKey(item, seen, { remaining: 256 })
			objects ??= new Map()
			const bucket = objects.get(key)
			if (bucket) {
				if (bucket.some(other => jsonEquals(item, other))) return false
				bucket.push(item)
			} else objects.set(key, [item])
		}
	}
	return true
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

export const isJsonSchemaObject = (value: unknown): value is object => {
	if (typeof value !== "object" || value === null) return false
	const proto = Object.getPrototypeOf(value)
	return proto === Object.prototype || proto === null
}

const escapePointer = (key: string) =>
	key.replace(/~/g, "~0").replace(/\//g, "~1")

const escapeRegex = (source: string) =>
	source.replace(/[$()*+./?[\\\]^{|}]/g, "\\$&")

const isSchema = (v: unknown) => typeof v === "boolean" || isJsonSchemaObject(v)

const isEvery = (v: unknown, allows: (element: unknown) => boolean) =>
	isArray(v) && v.every(allows)

const isEveryValue = (v: unknown, allows: (value: unknown) => boolean) =>
	isJsonSchemaObject(v) && Object.values(v).every(allows)

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
	pattern: ["a string or RegExp", v => isString(v) || v instanceof RegExp],
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
	pattern: "pattern",
	format: "string",
	prefixItems: "schemas",
	items: "items",
	additionalItems: "schema",
	minItems: "count",
	maxItems: "count",
	uniqueItems: "boolean",
	// OpenAPI 3.0
	nullable: "boolean",
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
	else: "schema",
	// checked wherever they are, as a $ref into them reads only its target
	$defs: "schemasByKey",
	definitions: "schemasByKey"
}

// keywords from 2019-09 on, which a draft-07 or earlier validator ignores
const unsupportedKeywords = [
	"$dynamicRef",
	"$recursiveRef",
	"unevaluatedItems",
	"unevaluatedProperties"
]

const checkKeyword = (
	o: dict,
	k: string,
	pointer: string,
	ctx: ReadContext
): void => {
	if (unsupportedKeywords.includes(k) && !ctx.dialectBefore2019)
		throwParseError(writeUnsupportedKeywordMessage(`${pointer}/${k}`))
	if (!hasOwn(keywordValueKinds, k)) return
	const [expected, allows] = keywordValues[keywordValueKinds[k]]
	if (!(allows as (v: unknown) => boolean)(o[k])) {
		throwParseError(
			writeInvalidKeywordMessage(`${pointer}/${k}`, expected, o[k])
		)
	}
	if (k === "nullable") checkNullable(o, pointer)
}

// like ajv, which throws compiling either, even beside a $ref whose siblings
// a draft-07 schema otherwise ignores
const checkNullable = (o: dict, pointer: string): void => {
	if (o.type === undefined)
		throwParseError(writeNullableWithoutTypeMessage(`${pointer}/nullable`))
	if (
		o.nullable === false &&
		(isArray(o.type) ? o.type : [o.type]).includes("null")
	)
		throwParseError(writeNonNullableNullMessage(`${pointer}/nullable`))
}

export const writeUnparsableSchemaMessage = (actual: string): string =>
	`Schema must be a Type, a Standard JSON Schema or a JSON Schema (was ${actual})`

export const writeUnreadableStandardSchemaMessage = (
	vendor: string,
	method: "input" | "output",
	cause: unknown
): string =>
	`${vendor}'s ~standard.jsonSchema.${method} threw (${cause instanceof Error ? cause.message : printable(cause)})`

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
	`${pointer} must reference a schema in its own document (was ${ref})`

export const writeUnresolvableRefMessage = (ref: string): string =>
	`$ref ${ref} doesn't resolve to a schema in its document`

export const writeNullableWithoutTypeMessage = (pointer: string): string =>
	`${pointer} must be beside a type, to which it adds null`

export const writeNonNullableNullMessage = (pointer: string): string =>
	`${pointer} can't be false beside a type that includes null`

export const writeShallowCycleMessage = (
	ref: string,
	pointer: string
): string => `${pointer} has a shallow $ref cycle (${ref})`

export const writeCircularSchemaMessage = (pointer: string): string =>
	`JSON Schema at ${pointer} is circular`

export const writeMaxDepthMessage = (
	pointer: string,
	maxDepth = maxReadDepth
): string =>
	`JSON Schema at ${pointer} exceeds maximum nesting depth of ${maxDepth}`

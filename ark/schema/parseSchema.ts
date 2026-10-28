import {
	builtinConstructors,
	domainDescriptions,
	hasDomain,
	isArray,
	isEmptyObject,
	liftArray,
	throwParseError,
	type array,
	type BuiltinObjectKind,
	type Constructor,
	type dict,
	type Key,
	type listable,
	type show
} from "@ark/util"
import { constraintInputOf, type Constraint } from "./constraint.ts"
import type { nodeOfKind, Prerequisite, reducibleKindOf } from "./kinds.ts"
import type { BaseNode } from "./node.ts"
import {
	compareInnerKeys,
	nodesById,
	writeInvalidSchemaMessage,
	type BaseParseOptions,
	type NodeId
} from "./parse.ts"
import type { Predicate } from "./predicate.ts"
import type { Domain } from "./roots/domain.ts"
import type { Intersection } from "./roots/intersection.ts"
import type { Morph } from "./roots/morph.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import type { TypeMeta } from "./shared/declare.ts"
import {
	constraintKeys,
	structureKeys,
	type ConstraintKind,
	type NodeKind,
	type OpenNodeKind,
	type RootKind
} from "./shared/implement.ts"
import { hasArkKind, isNode } from "./shared/utils.ts"
import type { Index } from "./structure/index.ts"
import type { UndeclaredKeyBehavior } from "./structure/structure.ts"

type withMetaPrefixedKeys<o> = {
	[k in keyof o as k extends string ? `meta.${k}` : never]: o[k]
}

export interface BaseNormalizedSchema extends withMetaPrefixedKeys<TypeMeta> {
	readonly meta?: ArkEnv.meta | string
}

interface AliasSchema<alias extends string = string>
	extends BaseNormalizedSchema {
	readonly reference: alias
	readonly resolve?: () => BaseRoot
	readonly operator?: string
	readonly operands?: readonly BaseRoot[]
}

interface DomainSchema<domain extends Domain.NonEnumerable>
	extends BaseNormalizedSchema,
		Domain.Inner<domain> {}

interface ProtoSchema<proto extends Constructor | BuiltinObjectKind>
	extends BaseNormalizedSchema {
	readonly proto: proto
	readonly dateAllowsInvalid?: boolean
}

interface UnitSchema<value = unknown> extends BaseNormalizedSchema {
	readonly unit: value
}

interface UnionSchema extends BaseNormalizedSchema {
	readonly branches: array<RootSchema>
	readonly ordered?: true
}

interface MorphSchema extends BaseNormalizedSchema {
	/** the schema its pipeline starts with, as morphs' first element can be */
	readonly in?: RootSchema
	readonly morphs: listable<Morph | RootSchema>
	readonly declaredIn?: BaseRoot
	readonly declaredOut?: BaseRoot
}

export type IntersectionSchema<inferredBasis = any> = show<
	BaseNormalizedSchema & {
		domain?: NodeSchema<"domain">
		proto?: NodeSchema<"proto">
	} & conditionalRootOf<inferredBasis>
>

interface StructureSchema extends BaseNormalizedSchema {
	readonly optional?: readonly OptionalSchema[]
	readonly required?: readonly PropSchema[]
	readonly index?: readonly IndexSchema[]
	readonly sequence?: SequenceSchema
	readonly undeclared?: UndeclaredKeyBehavior
	readonly order?: readonly Key[]
}

interface PropSchema extends BaseNormalizedSchema {
	readonly key: Key
	readonly value: RootSchema
}

interface OptionalSchema extends PropSchema {
	readonly default?: unknown
}

interface IndexSchema extends BaseNormalizedSchema {
	readonly signature: RootSchema<Index.KeyKind>
	readonly value: RootSchema
}

interface ExpandedSequenceSchema extends BaseNormalizedSchema {
	readonly prefix?: array<RootSchema>
	readonly defaultables?: array<[schema: RootSchema, defaultValue: unknown]>
	readonly optionals?: array<RootSchema>
	readonly variadic?: RootSchema
	readonly minVariadicLength?: number
	readonly postfix?: array<RootSchema>
}

type SequenceSchema = ExpandedSequenceSchema | RootSchema

interface RootSchemaList extends ReadonlyArray<RootSchema> {}

export interface NodeSchemasByKind {
	alias: `$${string}` | AliasSchema
	domain: Domain.NonEnumerable | DomainSchema<Domain.NonEnumerable>
	proto:
		| Constructor
		| BuiltinObjectKind
		| ProtoSchema<Constructor | BuiltinObjectKind>
	unit: UnitSchema
	union: UnionSchema | RootSchemaList
	morph: MorphSchema
	intersection: IntersectionSchema
	structure: StructureSchema
	required: PropSchema
	optional: OptionalSchema
	index: IndexSchema
	sequence: SequenceSchema
	predicate: Predicate.Schema
}

export type NodeSchema<kind extends NodeKind> =
	kind extends keyof NodeSchemasByKind ? NodeSchemasByKind[kind]
	: kind extends Constraint.PrimitiveKind ? Constraint.Schema<kind>
	: never

export type RootSchema<kind extends RootKind = RootKind> = NodeSchema<kind>

type ConditionalTerminalIntersectionRoot = {
	undeclared?: UndeclaredKeyBehavior
	order?: readonly Key[]
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionRoot

type ConditionalIntersectionKey =
	| ConstraintKind
	| ConditionalTerminalIntersectionKey

export type constraintKindOf<t> = {
	[k in ConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConstraintKind]

type conditionalIntersectionKeyOf<t> =
	| constraintKindOf<t>
	| (t extends object ? ConditionalTerminalIntersectionKey : never)

type intersectionChildSchemaValueOf<k extends Intersection.FlattenedChildKind> =
	k extends OpenNodeKind ? listable<NodeSchema<k>> : NodeSchema<k>

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends Intersection.FlattenedChildKind ? intersectionChildSchemaValueOf<k>
	:	ConditionalTerminalIntersectionRoot[k & ConditionalTerminalIntersectionKey]

export type conditionalRootOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalSchemaValueOfKey<k>
}

export const parseSchema = (
	schema: unknown,
	$: BaseScope,
	opts?: BaseParseOptions
): BaseRoot => parseNodeSchema(schemaKindOf(schema), schema, $, opts)

export const parseNodeSchema = <kind extends NodeKind>(
	kind: kind,
	schema: unknown,
	$: BaseScope,
	opts?: BaseParseOptions
): nodeOfKind<reducibleKindOf<kind>> => {
	// a sequence's schema may be its variadic element
	if (isNode(schema) && !(kind === "sequence" && schema.isRoot()))
		return $.node(kind, schema as never, opts) as never
	const input = readers[kind](schema, $, opts)
	return isNode(input) ?
			($.node(input.kind, input as never, opts) as never)
		:	($.node(kind, withPrefixedMeta(input as dict) as never, opts) as never)
}

export const schemaKindOf = <kind extends RootKind = RootKind>(
	schema: unknown,
	allowedKinds?: readonly kind[]
): kind => {
	const kind = discriminateRootKind(schema)
	if (allowedKinds && !allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Root of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return kind as never
}

const discriminateRootKind = (schema: unknown): RootKind => {
	if (hasArkKind(schema, "root")) return schema.kind
	if (typeof schema === "string") {
		return (
			schema[0] === "$" ? "alias"
			: schema in domainDescriptions ? "domain"
			: "proto"
		)
	}
	if (typeof schema === "function") return "proto"

	// throw at end of function
	if (typeof schema !== "object" || schema === null)
		return throwParseError(writeInvalidSchemaMessage(schema))

	if ("morphs" in schema) return "morph"

	if ("branches" in schema || isArray(schema)) return "union"

	if ("unit" in schema) return "unit"

	if ("reference" in schema) return "alias"

	const schemaKeys = Object.keys(schema)

	if (schemaKeys.length === 0 || schemaKeys.some(k => k in constraintKeys))
		return "intersection"
	if ("proto" in schema) return "proto"
	if ("domain" in schema) return "domain"

	return throwParseError(writeInvalidSchemaMessage(schema))
}

type SchemaReader = (
	schema: any,
	$: BaseScope,
	opts: BaseParseOptions | undefined
) => object

const readConstraint =
	(kind: Constraint.PrimitiveKind): SchemaReader =>
	schema =>
		constraintInputOf(kind, schema)

const readProp = (schema: PropSchema, $: BaseScope) => ({
	...schema,
	value: parseSchema(schema.value, $)
})

const readers: Record<NodeKind, SchemaReader> = {
	alias: (schema, $, opts) => {
		const input: AliasSchema =
			typeof schema === "string" ? { reference: schema } : schema
		if (opts?.reduced || !input.reference.startsWith("$")) return input
		const registered =
			input.reference.startsWith("$ark.") ?
				nodesById[input.reference.slice(5) as NodeId]
			:	undefined
		return hasArkKind(registered, "root") ? registered : (
				$.resolveRoot(input.reference.slice(1))
			)
	},
	domain: schema => (typeof schema === "string" ? { domain: schema } : schema),
	proto: schema =>
		typeof schema === "string" ?
			{ proto: builtinConstructors[schema as keyof builtinConstructors] }
		: typeof schema === "function" ? { proto: schema }
		: typeof schema.proto === "string" ?
			{
				...schema,
				proto: builtinConstructors[schema.proto as keyof builtinConstructors]
			}
		:	schema,
	unit: schema => schema,
	union: (schema, $) => {
		const { branches, ...input }: UnionSchema =
			isArray(schema) ? { branches: schema } : schema
		return {
			...input,
			branches: branches.map(branch => parseSchema(branch, $))
		}
	},
	morph: (schema: MorphSchema, $) => {
		const { in: inSchema, morphs, ...input } = schema
		const steps = liftArray(morphs).map(step =>
			typeof step === "function" ? step : parseSchema(step, $)
		)
		return {
			...input,
			morphs:
				inSchema === undefined ? steps : [parseSchema(inSchema, $), ...steps]
		}
	},
	intersection: (schema: dict, $) => {
		const { structure, ...flattened } = schema
		const structureSchema: dict = (structure as dict | undefined) ?? {}
		const input: dict = {}
		for (const k of keysInParseOrder(flattened)) {
			const v = flattened[k]
			if (k in structureKeys) {
				if (structure) {
					throwParseError(
						`Flattened structure key ${k} cannot be specified alongside a root 'structure' key.`
					)
				}
				structureSchema[k] = v
			} else if (k in constraintKeys) {
				const constraint = parseConstraint(k as ConstraintKind, v, $)
				if (constraint) input[k] = constraint
			} else if (k === "domain" || k === "proto")
				input[k] = parseNodeSchema(k, v, $)
			else input[k] = v
		}
		if (
			hasArkKind(structureSchema, "constraint") ||
			!isEmptyObject(structureSchema)
		)
			input.structure = parseNodeSchema("structure", structureSchema, $)
		return input
	},
	structure: (schema: dict, $) => {
		const input: dict = {}
		for (const k of keysInParseOrder(schema)) {
			const v = schema[k]
			if (k === "sequence") input[k] = parseNodeSchema(k, v, $)
			else if (k in constraintKeys) {
				const constraint = parseConstraint(k as ConstraintKind, v, $)
				if (constraint) input[k] = constraint
			} else input[k] = v
		}
		return input
	},
	required: readProp,
	optional: readProp,
	index: (schema: IndexSchema, $) => ({
		...schema,
		signature: parseSchema(schema.signature, $),
		value: parseSchema(schema.value, $)
	}),
	sequence: (schema, $) => {
		if (!isExpandedSequenceSchema(schema))
			return { variadic: parseSchema(schema, $) }
		const {
			prefix,
			defaultables,
			optionals,
			variadic,
			minVariadicLength,
			postfix,
			...input
		} = schema
		// empty affixes are omitted. an empty array should therefore
		// be specified as `{ proto: Array, length: 0 }`
		if (prefix?.length) input.prefix = prefix.map(e => parseSchema(e, $))
		if (defaultables?.length) {
			input.defaultables = defaultables.map(([e, value]) => [
				parseSchema(e, $),
				value
			])
		}
		if (optionals?.length)
			input.optionals = optionals.map(e => parseSchema(e, $))
		if (variadic !== undefined) input.variadic = parseSchema(variadic, $)
		if (minVariadicLength) input.minVariadicLength = minVariadicLength
		if (postfix?.length) input.postfix = postfix.map(e => parseSchema(e, $))
		return input
	},
	predicate: readConstraint("predicate"),
	divisor: readConstraint("divisor"),
	exactLength: readConstraint("exactLength"),
	max: readConstraint("max"),
	min: readConstraint("min"),
	maxLength: readConstraint("maxLength"),
	minLength: readConstraint("minLength"),
	before: readConstraint("before"),
	after: readConstraint("after"),
	notEqual: readConstraint("notEqual"),
	notEqualLength: readConstraint("notEqualLength"),
	pattern: readConstraint("pattern")
}

const parseConstraint = (
	kind: ConstraintKind,
	schema: unknown,
	$: BaseScope
): listable<BaseNode> | undefined => {
	if (isArray(schema)) {
		// empty lists are omitted
		if (schema.length === 0) return
		return schema.map(s => parseNodeSchema(kind, s, $))
	}
	const constraint: BaseNode = parseNodeSchema(kind, schema, $)
	// a constraint reducing to a root, like unknown for minLength: 0, is trivially satisfied
	if (constraint.isRoot()) return
	return constraint.canStack() ? [constraint] : constraint
}

const isExpandedSequenceSchema = (
	schema: SequenceSchema
): schema is ExpandedSequenceSchema & dict =>
	hasDomain(schema, "object") &&
	!isArray(schema) &&
	!isNode(schema) &&
	("variadic" in schema ||
		"prefix" in schema ||
		"defaultables" in schema ||
		"optionals" in schema ||
		"postfix" in schema ||
		"minVariadicLength" in schema)

// children are parsed after other keys, in order of precedence
const keysInParseOrder = (schema: dict): string[] =>
	Object.keys(schema).sort(compareInnerKeys)

// meta. prefixed keys are moved to meta, overwriting a nested key of the same name
const withPrefixedMeta = (input: dict): dict => {
	let meta: dict | undefined
	let rest: dict | undefined
	for (const k in input) {
		if (!k.startsWith("meta.")) continue
		rest ??= { ...input }
		meta ??=
			typeof input.meta === "string" ? { description: input.meta }
			: input.meta ? { ...(input.meta as dict) }
			: {}
		meta[k.slice(5)] = input[k]
		delete rest[k]
	}
	return rest ? { ...rest, meta } : input
}

import {
	compileSerializedValue,
	isArray,
	morph,
	throwParseError,
	type ErrorMessage,
	type JsonData,
	type List,
	type entryOf,
	type listable,
	type parseNonNegativeInteger,
	type requireKeys
} from "@arktype/util"
import type { Node, UnknownNode } from "../base.js"
import type { Declaration, ExpectedContext, Inner, Schema } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type {
	NodeConfig,
	ParsedUnknownNodeConfig,
	ScopeNode
} from "../scope.js"
import type { NodeCompiler } from "./compile.js"
import type { TraverseAllows, TraverseApply } from "./context.js"
import type {
	BaseExpectedContext,
	BaseMeta,
	BaseNodeDeclaration,
	ownIntersectionAlternateResult
} from "./declare.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const boundKinds = [
	"min",
	"max",
	"minLength",
	"maxLength",
	"after",
	"before"
] as const

export type BoundKind = (typeof boundKinds)[number]

export const propKinds = ["required", "optional", "index", "sequence"] as const

export type PropKind = (typeof propKinds)[number]

export const refinementKinds = ["pattern", "divisor", ...boundKinds] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const constraintKinds = [
	...refinementKinds,
	...propKinds,
	"predicate"
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const typeKinds = [
	"union",
	"morph",
	"intersection",
	...basisKinds
] as const

export type TypeKind = (typeof typeKinds)[number]

export const intersectionChildKinds = [
	...basisKinds,
	...constraintKinds
] as const

export type IntersectionChildKind = (typeof intersectionChildKinds)[number]

export type NodeKind = TypeKind | ConstraintKind

export const nodeKinds = [
	"union",
	"morph",
	"unit",
	"intersection",
	"proto",
	"domain",
	...constraintKinds,
	...propKinds
] as const satisfies NodeKind[]

export type OpenNodeKind = {
	[k in NodeKind]: Declaration<k>["open"] extends true ? k : never
}[NodeKind]

export type ClosedNodeKind = Exclude<NodeKind, OpenNodeKind>

export const primitiveKinds = [
	...basisKinds,
	...refinementKinds,
	"predicate"
] as const

export type PrimitiveKind = (typeof primitiveKinds)[number]

export type CompositeKind = Exclude<NodeKind, PrimitiveKind>

export type OrderedNodeKinds = typeof nodeKinds

type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

export type kindRightOf<kind extends NodeKind> = RightsByKind[kind]

type accumulateRightKinds<
	remaining extends readonly NodeKind[],
	result
> = remaining extends readonly [
	infer head extends NodeKind,
	...infer tail extends NodeKind[]
]
	? accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	: result

type indexOf<array extends List> = keyof array extends infer k
	? parseNonNegativeInteger<k & string>
	: never

type PrecedenceByKind = {
	[i in indexOf<OrderedNodeKinds> as OrderedNodeKinds[i]]: i
}

const precedenceByKind = morph(
	nodeKinds,
	(i, kind) => [kind, i] as entryOf<PrecedenceByKind>
)

export type precedenceOfKind<kind extends NodeKind> = PrecedenceByKind[kind]

export const precedenceOfKind = <kind extends NodeKind>(kind: kind) =>
	precedenceByKind[kind]

export type KeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in keyRequiringDefinition<d>]: NodeKeyImplementation<d, k>
}

type keyRequiringDefinition<d extends BaseNodeDeclaration> = Exclude<
	keyof d["normalizedSchema"],
	keyof BaseMeta
>

export const defaultValueSerializer = (v: unknown) => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	) {
		return v
	}
	return compileSerializedValue(v)
}

export type NodeKeyImplementation<
	d extends BaseNodeDeclaration,
	k extends keyof d["normalizedSchema"],
	instantiated = k extends keyof d["inner"] ? d["inner"][k] : never
> = requireKeys<
	{
		preserveUndefined?: true
		meta?: true
		child?: true
		serialize?: (
			schema: instantiated extends listable<UnknownNode> | undefined
				? ErrorMessage<`Keys with node children cannot specify a custom serializer`>
				: instantiated
		) => JsonData
		parse?: (
			schema: Exclude<d["normalizedSchema"][k], undefined>,
			ctx: SchemaParseContext
		) => instantiated
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	| (d["normalizedSchema"][k] extends instantiated ? never : "parse")
	// require keys containing children specify it
	| ([instantiated] extends [listable<UnknownNode> | undefined]
			? "child"
			: never)
>

interface CommonNodeImplementationInput<d extends BaseNodeDeclaration> {
	keys: KeyDefinitions<d>
	normalize: (schema: d["schema"]) => d["normalizedSchema"]
	hasAssociatedError: d["expectedContext"] extends null ? false : true
	intersectSymmetric: (
		l: Node<d["kind"]>,
		r: Node<d["kind"]>
	) => Node | ownIntersectionAlternateResult<d>
	collapseKey?: keyof d["inner"] & string
	reduce?: (inner: d["inner"], $: ScopeNode) => Node | undefined
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<BaseNodeDeclaration> {
	defaults: ParsedUnknownNodeConfig
	keys: Record<string, NodeKeyImplementation<any, any>>
}

export type nodeImplementationOf<d extends BaseNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		defaults: nodeDefaultsImplementationFor<d["kind"]>
	}

export type nodeImplementationInputOf<d extends BaseNodeDeclaration> =
	CommonNodeImplementationInput<d> & {
		defaults: nodeDefaultsImplementationInputFor<d["kind"]>
	}

type nodeDefaultsImplementationInputFor<kind extends NodeKind> = requireKeys<
	NodeConfig<kind>,
	| "description"
	// if the node's error context is distinct from its inner definition, ensure it is implemented.
	// this occurs for nodes like `union` where the error that occurs is not 1:1 with the existing node,
	// but rather a single failed condition for each branch.
	| (Inner<kind> extends Omit<
			ExpectedContext<kind>,
			keyof BaseExpectedContext | "description"
	  >
			? never
			: "expected" & keyof NodeConfig<kind>)
>

export type nodeDefaultsImplementationFor<kind extends NodeKind> = Required<
	NodeConfig<kind>
>

export type DescriptionWriter<kind extends NodeKind = NodeKind> = (
	inner: NodeKind extends kind ? any : Omit<Inner<kind>, "description">
) => string

export const throwInvalidOperandError = (
	kind: ConstraintKind,
	expected: string,
	basis: Node<BasisKind> | undefined
) => throwParseError(`${kind} operand must be ${expected} (was ${basis})`)

export const parseOpen = <kind extends OpenNodeKind>(
	kind: kind,
	input: listable<Schema<kind>>,
	ctx: SchemaParseContext
): readonly Node<kind>[] | undefined => {
	if (isArray(input)) {
		if (input.length === 0) {
			// Omit empty lists as input
			return
		}
		return input
			.map((node) => ctx.$.parse(kind, node))
			.sort((l, r) => (l.innerId < r.innerId ? -1 : 1)) as never
	}
	return [ctx.$.parse(kind, input)] as never
}

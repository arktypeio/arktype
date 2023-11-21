import type {
	Dict,
	ErrorMessage,
	JsonData,
	PartialRecord,
	evaluate,
	listable,
	optionalizeKeys,
	requireKeys,
	requiredKeyOf,
	satisfy
} from "@arktype/util"
import { compileSerializedValue } from "../io/compile.js"
import type { RootNode, UnknownNode, reducibleKindOf } from "../node.js"
import type {
	BaseAttributes,
	BaseNodeDeclaration,
	BaseSchemaParseContext
} from "./declare.js"
import type { reifyIntersections } from "./intersect.js"
import type { Declaration, Node, NormalizedSchema } from "./node.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const closedRefinementKinds = ["divisor", "max", "min"] as const

export type ClosedRefinementKind = (typeof closedRefinementKinds)[number]

export const openRefinementKinds = [
	"pattern",
	"predicate",
	"required",
	"optional"
] as const

export type OpenRefinementKind = (typeof openRefinementKinds)[number]

export const refinementKinds = [
	...closedRefinementKinds,
	...openRefinementKinds
] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const setKinds = ["union", "morph", "intersection"] as const

export type SetKind = (typeof setKinds)[number]

export const rootKinds = [...setKinds, ...basisKinds] as const

export type RootKind = (typeof rootKinds)[number]

export const constraintKinds = [...basisKinds, ...refinementKinds] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const nodeKinds = [...setKinds, ...constraintKinds] as const

export type NodeKind = (typeof nodeKinds)[number]

export type OrderedNodeKinds = typeof nodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type Root<
	t = unknown,
	kind extends RootKind = RootKind
> = kind extends RootKind ? RootNode<kind, t> : never

type BaseAttributeKeyDefinitions = {
	[k in keyof BaseAttributes]: NodeKeyDefinition<BaseNodeDeclaration, k>
}

export type instantiateNodeImplementation<definition> = evaluate<
	definition & {
		keys: BaseAttributeKeyDefinitions
		defaultableKeys: definition extends { keys: infer keys }
			? (keyof keys | keyof BaseAttributeKeyDefinitions)[]
			: never
	}
>

export type InnerKeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in Exclude<keyof d["inner"], keyof BaseAttributes>]: NodeKeyDefinition<
		d,
		k
	>
}

export type ConstraintAttachments = {
	readonly condition: string
}

export const defaultInnerKeySerializer = (v: unknown) => {
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

export type normalizeSchema<schema, inner extends BaseAttributes> = requireKeys<
	Extract<schema, PartialRecord<requiredKeyOf<inner>>>,
	requiredKeyOf<inner>
>

export type NodeKeyDefinition<
	d extends BaseNodeDeclaration,
	k extends keyof d["inner"]
> = requireKeys<
	{
		meta?: true
		preserveUndefined?: true
		serialize?: (
			schema: d["inner"][k] extends listable<UnknownNode> | undefined
				? ErrorMessage<`Keys with node children cannot specify a custom serializer`>
				: d["inner"][k]
		) => JsonData
		parse?: (
			schema: k extends keyof NormalizedSchema<d["kind"]>
				? Exclude<NormalizedSchema<d["kind"]>[k], undefined>
				: undefined,
			ctx: d["context"]
		) => d["inner"][k]
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	NormalizedSchema<d["kind"]> extends Pick<d["inner"], k> ? never : "parse"
>

export type NodeImplementationInput<d extends BaseNodeDeclaration> =
	requireKeys<
		{
			kind: d["kind"]
			keys: InnerKeyDefinitions<d>
			intersections: reifyIntersections<d["kind"], d["intersections"]>
			writeDefaultDescription: (inner: Node<d["kind"]>) => string
			attach: (inner: Node<d["kind"]>) => {
				[k in unsatisfiedAttachKey<d>]: d["attach"][k]
			}
			normalize: (
				schema: d["schema"],
				ctx: d["context"]
			) => normalizeSchema<d["schema"], d["inner"]>
			addContext?: (
				ctx: BaseSchemaParseContext<d["kind"]>
			) => Omit<d["context"], keyof BaseSchemaParseContext<d["kind"]>>
			reduce?: (
				inner: d["inner"],
				ctx: d["context"]
			) => Node<reducibleKindOf<d["kind"]>> | undefined
		}, // require addContext if we need additional context specific to the node
		keyof d["context"] extends keyof BaseSchemaParseContext<d["kind"]>
			? never
			: "addContext"
	>

export type UnknownNodeImplementation = optionalizeKeys<
	instantiateNodeImplementation<
		NodeImplementationInput<BaseNodeDeclaration> & {
			keys: Dict<string, NodeKeyDefinition<any, any>>
		}
	>,
	"reduce" | "addContext"
>

type unsatisfiedAttachKey<d extends BaseNodeDeclaration> = {
	[k in keyof d["attach"]]: k extends keyof d["inner"]
		? d["inner"][k] extends d["attach"][k]
			? never
			: k
		: k
}[keyof d["attach"]]

export function defineNode<
	kind extends NodeKind,
	input extends NodeImplementationInput<Declaration<kind>>
>(input: { kind: kind } & input): instantiateNodeImplementation<input>
export function defineNode(
	input: NodeImplementationInput<any>
): UnknownNodeImplementation {
	return Object.assign(input.keys, {
		alias: {
			meta: true
		},
		description: {
			meta: true
		}
	}) as never
}

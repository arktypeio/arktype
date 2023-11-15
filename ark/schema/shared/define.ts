import {
	type Dict,
	entriesOf,
	type evaluate,
	type optionalizeKeys
} from "@arktype/util"
import type { ParseContext } from "../parse.ts"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.ts"
import type { rightOf } from "./intersect.ts"
import type {
	Declaration,
	ExpandedSchema,
	Inner,
	Node,
	NodeKind
} from "./node.ts"
import type { RootKind } from "./root.ts"

type BaseAttributeKeyDefinitions = {
	[k in keyof BaseAttributes]: NodeKeyDefinition<BaseNodeDeclaration, k>
}

export type instantiateNodeImplementation<definition> = evaluate<
	definition & {
		keys: BaseAttributeKeyDefinitions
	} & {
		keyEntries: definition extends { keys: infer keys }
			? entriesOf<keys & BaseAttributeKeyDefinitions>
			: never
	}
>

export type InnerKeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in Exclude<keyof d["inner"], keyof BaseAttributes>]: NodeKeyDefinition<
		d,
		k
	>
}

export type NodeKeyDefinition<
	d extends BaseNodeDeclaration,
	k extends keyof d["inner"]
> = {
	meta?: true
	children?: readonly NodeKind[]
	parse?: (
		schema: k extends keyof ExpandedSchema<d["kind"]>
			? ExpandedSchema<d["kind"]>[k]
			: undefined,
		ctx: ParseContext
	) => d["inner"][k]
	// require parse or children if we can't guarantee the schema value will be valid on inner
} & (ExpandedSchema<d["kind"]>[k] extends d["inner"][k]
	? {}
	: { parse: {} } | { children: {} })

export type NodeImplementation<d extends BaseNodeDeclaration> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	writeDefaultDescription: (inner: Node<d["kind"]>) => string
	attach: (inner: Node<d["kind"]>) => {
		[k in unsatisfiedAttachKey<d>]: d["attach"][k]
	}
	reduce?: (
		inner: d["inner"]
	) => Node<Extract<RootKind, rightOf<d["kind"]>>> | d["inner"]
	expand?: (
		schema: d["collapsedSchema"] | d["expandedSchema"]
	) => d["expandedSchema"]
	// require expand if collapsedSchema is defined
} & ("collapsedSchema" extends keyof d ? { expand: {} } : {})

export type UnknownNodeImplementation = optionalizeKeys<
	instantiateNodeImplementation<
		NodeImplementation<BaseNodeDeclaration> & {
			keys: Dict<string, NodeKeyDefinition<any, any>>
		}
	>,
	"expand"
>

type unsatisfiedAttachKey<d extends BaseNodeDeclaration> = {
	[k in keyof d["attach"]]: k extends keyof d["inner"]
		? d["inner"][k] extends d["attach"][k]
			? never
			: k
		: k
}[keyof d["attach"]]

export type reifyIntersections<lKind extends NodeKind, intersectionMap> = {
	[rKind in keyof intersectionMap]: rKind extends "default"
		? (
				l: Node<lKind>,
				r: Node<Exclude<rightOf<lKind>, keyof intersectionMap>>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
		: (
				l: Node<lKind>,
				r: Node<rKind & NodeKind>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
}

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

export const defineNode = <
	kind extends NodeKind,
	implementation extends NodeImplementation<Declaration<kind>>
>(
	implementation: { kind: kind } & implementation
): instantiateNodeImplementation<implementation> => {
	Object.assign(implementation.keys, {
		alias: {
			meta: true
		},
		description: {
			meta: true
		}
	})
	return Object.assign(implementation, {
		keyEntries: entriesOf(implementation.keys)
	}) as never
}

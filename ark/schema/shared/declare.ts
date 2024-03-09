import type { evaluate, merge } from "@arktype/util"
import type { NarrowedAttachments, Node } from "../base.js"
import type { reducibleKindOf } from "../kinds.js"
import type { Disjoint } from "./disjoint.js"
import type { NodeKind } from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export const metaKeys: { [k in keyof BaseMeta]: 1 } = { description: 1 }

export type NodeCompositionKind = "primitive" | "composite"

interface DeclarationInput {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	reducibleTo?: NodeKind
	hasOpenIntersection?: true
	errorContext?: object
	prerequisite?: unknown
	childKind?: NodeKind
}

export interface BaseErrorContext<kind extends NodeKind = NodeKind> {
	code: kind
	description: string
}

export type defaultErrorContext<d extends DeclarationInput> = evaluate<
	BaseErrorContext<d["kind"]> & d["inner"]
>

export type declareNode<
	d extends {
		[k in keyof d]: k extends keyof DeclarationInput
			? DeclarationInput[k]
			: never
	} & DeclarationInput
> = merge<
	{
		hasOpenIntersection: false
		prerequisite: prerequisiteOf<d>
		childKind: never
		reducibleTo: d["kind"]
		errorContext: null
	},
	d & {
		errorContext: d["errorContext"] extends {}
			? BaseErrorContext<d["kind"]>
			: null
	}
>

type prerequisiteOf<d extends DeclarationInput> = "prerequisite" extends keyof d
	? d["prerequisite"]
	: unknown

export type attachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> & d["inner"]

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	reducibleTo: NodeKind
	prerequisite: any
	hasOpenIntersection: boolean
	childKind: NodeKind
	errorContext: BaseErrorContext | null
}

export type ownIntersectionResult<d extends BaseNodeDeclaration> =
	| Node<reducibleKindOf<d["kind"]>>
	| Disjoint

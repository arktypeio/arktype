import type { Dict, and, mutable } from "@arktype/util"
import type { NarrowedAttachments, Node, TypeSchema } from "../base.js"
import type { Declaration, reducibleKindOf } from "../kinds.js"
import type { IntersectionInner } from "../sets/intersection.js"
import type { Disjoint } from "./disjoint.js"
import type {
	ConstraintGroupName,
	NodeKind,
	PrimitiveAttachments,
	PrimitiveKind,
	PropKind,
	RefinementKind,
	SetKind,
	kindRightOf
} from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export type DeclarationInput<kind extends NodeKind = NodeKind> = {
	kind: kind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	disjoinable?: true
	open?: true
	primitive?: true
	expectedContext?: unknown
	prerequisite?: unknown
	childKind?: NodeKind
}

type ParentsByKind = {
	[k in NodeKind]: {
		[pKind in NodeKind]: k extends Declaration<k>["childKind"] ? pKind : never
	}[NodeKind]
}

type parentKindOf<kind extends NodeKind> = ParentsByKind[kind]

export type declareNode<d extends DeclarationInput> = and<
	d,
	{
		disjoinable: d["disjoinable"] extends true ? true : false
		open: d["open"] extends true ? true : false
		primitive: d["primitive"] extends true ? true : false
		prerequisite: prerequisiteOf<d>
		childKind: d["childKind"] extends string ? d["childKind"] : never
		parentKind: parentKindOf<d["kind"]>
		expectedContext: d["expectedContext"] extends {}
			? {}
			: d["expectedContext"] extends null
			? null
			: d["inner"]
	}
>

type prerequisiteOf<d extends DeclarationInput> = "prerequisite" extends keyof d
	? d["prerequisite"]
	: unknown

export type attachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> &
		d["inner"] &
		(d["primitive"] extends true ? PrimitiveAttachments<d> : {})

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	prerequisite: any
	disjoinable: boolean
	open: boolean
	primitive: boolean
	childKind: NodeKind
	parentKind: SetKind | PropKind
	expectedContext: unknown
}

export type ownIntersectionResult<d extends BaseNodeDeclaration> =
	| Node<reducibleKindOf<d["kind"]>>
	| ownIntersectionAlternateResult<d>

export type ownIntersectionAlternateResult<d extends BaseNodeDeclaration> =
	| (d["open"] extends true ? null : never)
	| (d["disjoinable"] extends true ? Disjoint : never)

export type FoldInput<kind extends RefinementKind> = {
	-readonly [k in Exclude<
		keyof IntersectionInner,
		kindRightOf<kind>
	>]: IntersectionInner[k] extends readonly unknown[] | undefined
		? mutable<IntersectionInner[k]>
		: IntersectionInner[k]
}

export type FoldOutput<kind extends RefinementKind> = FoldInput<kind> | Disjoint

export interface BaseConstraint<kind extends RefinementKind> {
	foldIntersection(into: FoldInput<kind>): FoldOutput<kind>
	// TODO: update
	readonly constraintGroup: ConstraintGroupName
	readonly prerequisiteSchemas: readonly TypeSchema[]
}

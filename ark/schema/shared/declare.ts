import type { Dict, and, evaluate } from "@arktype/util"
import type { NarrowedAttachments, TypeSchema } from "../base.js"
import type { Declaration, OpenComponentKind } from "../kinds.js"
import type { Disjoint } from "./disjoint.js"
import type {
	ConstraintGroupName,
	ConstraintKind,
	NodeKind,
	PrimitiveKind,
	PropKind,
	SetKind
} from "./implement.js"
import type { kindRightOf } from "./intersect.js"

export interface BaseMeta {
	readonly description?: string
}

export type BaseIntersectionMap = {
	[lKey in NodeKind]: evaluate<
		{
			[requiredKey in lKey]:
				| lKey
				| Disjoint
				| (lKey extends OpenComponentKind ? null : never)
		} & {
			[rKey in kindRightOf<lKey> | "default"]?:
				| lKey
				| Disjoint
				| (lKey extends ConstraintKind ? null : never)
		}
	>
}

export type UnknownIntersections = {
	[rKey in NodeKind | "default"]?: NodeKind | Disjoint | null
}

export type DeclarationInput<kind extends NodeKind = NodeKind> = {
	kind: kind
	schema: unknown
	intersections: UnknownIntersections
	normalizedSchema: BaseMeta
	inner: BaseMeta
	expectedContext?: Dict
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
	NarrowedAttachments<d> & d["inner"]

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	prerequisite: any
	childKind: NodeKind
	parentKind: SetKind | PropKind
	expectedContext: unknown
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
}

export interface BasePrimitive {
	readonly kind: PrimitiveKind
	readonly compiledCondition: string
	readonly compiledNegation: string
}

export interface BaseComponent {
	readonly constraintGroup: ConstraintGroupName
	readonly prerequisiteSchemas: readonly TypeSchema[]
}

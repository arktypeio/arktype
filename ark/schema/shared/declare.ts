import type { and, mutable } from "@arktype/util"
import type { NarrowedAttachments, Node, TypeSchema } from "../base.js"
import type { Declaration, ExpectedContext, reducibleKindOf } from "../kinds.js"
import type { IntersectionInner } from "../sets/intersection.js"
import type { TraverseApply } from "../traversal/context.js"
import type { CompilationContext } from "./compile.js"
import type { Disjoint } from "./disjoint.js"
import type {
	ConstraintGroupName,
	NodeKind,
	PrimitiveAttachmentsInput,
	PropKind,
	RefinementKind,
	SetKind,
	kindRightOf
} from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export type NodeCompositionKind = "primitive" | "composite"

interface BaseDeclarationInput {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	disjoinable?: true
	open?: true
	attachments?: object
	expectedContext?: unknown
	prerequisite?: unknown
}

interface CompositeDeclarationInput extends BaseDeclarationInput {
	composition: "composite"
	childKind: NodeKind
}

interface PrimitiveDeclarationInput extends BaseDeclarationInput {
	composition: "primitive"
}

type DeclarationInput = CompositeDeclarationInput | PrimitiveDeclarationInput

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
		attachments: d["attachments"] extends object ? d["attachments"] : {}
		prerequisite: prerequisiteOf<d>
		childKind: "childKind" extends keyof d ? d["childKind"] : never
		parentKind: parentKindOf<d["kind"]>
		expectedContext: d["expectedContext"] extends {} ? {} : d["inner"]
	}
>

type prerequisiteOf<d extends DeclarationInput> = "prerequisite" extends keyof d
	? d["prerequisite"]
	: unknown

export type baseAttachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> & d["inner"]

export type attachmentsOf<d extends BaseNodeDeclaration> =
	baseAttachmentsOf<d> &
		d["attachments"] &
		(d["attachments"] extends PrimitiveAttachmentsInput
			? DerivablePrimitiveAttachments<d>
			: {})

export interface DerivablePrimitiveAttachments<d extends BaseNodeDeclaration> {
	traverseApply: TraverseApply<d["prerequisite"]>
	compileApply(ctx: CompilationContext): string
	compileAllows(ctx: CompilationContext): string
	expectedContext: ExpectedContext<d["kind"]>
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	prerequisite: any
	disjoinable: boolean
	open: boolean
	attachments: object
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

export interface BaseRefinement<kind extends RefinementKind> {
	foldIntersection(into: FoldInput<kind>): FoldOutput<kind>
	// TODO: update
	readonly constraintGroup: ConstraintGroupName
	readonly prerequisiteSchemas: readonly TypeSchema[]
}

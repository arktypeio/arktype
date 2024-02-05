import type { and } from "@arktype/util"
import type { NarrowedAttachments, Node } from "../base.js"
import type { Declaration, ExpectedContext, reducibleKindOf } from "../kinds.js"
import type { TraverseApply } from "../traversal/context.js"
import type { CompilationContext } from "./compile.js"
import type { Disjoint } from "./disjoint.js"
import type { CompositeKind, NodeKind } from "./implement.js"

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
		prerequisite: prerequisiteOf<d>
		childKind: "childKind" extends keyof d ? d["childKind"] : never
		parentKind: parentKindOf<d["kind"]>
		expectedContext: d["expectedContext"] extends {} ? {} : d["inner"]
	}
>

type prerequisiteOf<d extends DeclarationInput> = "prerequisite" extends keyof d
	? d["prerequisite"]
	: unknown

export type attachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> & d["inner"]

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
	childKind: NodeKind
	parentKind: CompositeKind
	expectedContext: unknown
}

export type ownIntersectionResult<d extends BaseNodeDeclaration> =
	| Node<reducibleKindOf<d["kind"]>>
	| ownIntersectionAlternateResult<d>

export type ownIntersectionAlternateResult<d extends BaseNodeDeclaration> =
	| (d["open"] extends true ? null : never)
	| (d["disjoinable"] extends true ? Disjoint : never)

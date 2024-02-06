import type { and, evaluate, exactMessageOnError, merge } from "@arktype/util"
import type { NarrowedAttachments, Node } from "../base.js"
import type { Declaration, reducibleKindOf } from "../kinds.js"
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
	expectedContext?: object
	prerequisite?: unknown
}

export interface BaseExpectedContext<kind extends NodeKind = NodeKind> {
	code: kind
	description: string
}

interface CompositeDeclarationInput extends BaseDeclarationInput {
	composition: "composite"
	childKind: NodeKind
}

interface PrimitiveDeclarationInput extends BaseDeclarationInput {
	composition: "primitive"
	childKind?: never
}

type DeclarationInput = CompositeDeclarationInput | PrimitiveDeclarationInput

export type defaultExpectedContext<d extends DeclarationInput> = evaluate<
	BaseExpectedContext<d["kind"]> & { description: string } & d["inner"]
>

export type declareNode<
	d extends {
		[k in keyof d]: k extends keyof DeclarationInput
			? DeclarationInput[k]
			: never
	} & DeclarationInput
> = merge<
	{
		disjoinable: false
		open: false
		prerequisite: prerequisiteOf<d>
		childKind: never
		expectedContext: null
	},
	d & {
		expectedContext: d["expectedContext"] extends {}
			? BaseExpectedContext<d["kind"]>
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
	prerequisite: any
	disjoinable: boolean
	open: boolean
	childKind: NodeKind
	expectedContext: BaseExpectedContext | null
}

export type ownIntersectionResult<d extends BaseNodeDeclaration> =
	| Node<reducibleKindOf<d["kind"]>>
	| ownIntersectionAlternateResult<d>

export type ownIntersectionAlternateResult<d extends BaseNodeDeclaration> =
	| (d["open"] extends true ? null : never)
	| (d["disjoinable"] extends true ? Disjoint : never)

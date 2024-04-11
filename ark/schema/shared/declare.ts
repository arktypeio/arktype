import type { evaluate, merge } from "@arktype/util"
import type { NarrowedAttachments, Node } from "../base.js"
import type { reducibleKindOf } from "../kinds.js"
import type { Disjoint } from "./disjoint.js"
import type { NodeKind } from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export const metaKeys: { [k in keyof BaseMeta]: 1 } = { description: 1 }

interface DeclarationInput {
	kind: NodeKind
	def: unknown
	normalizedDef: BaseMeta
	inner: BaseMeta
	attachments: object
	reducibleTo?: NodeKind
	intersectionIsOpen?: true
	errorContext?: object
	prerequisite?: unknown
	childKind?: NodeKind
}

export interface BaseErrorContext<kind extends NodeKind = NodeKind> {
	code: kind
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
		intersectionIsOpen: false
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

export type parsedAttachmentsOf<d extends RawNodeDeclaration> =
	NarrowedAttachments<d> & d["inner"]

export type attachmentsOf<d extends RawNodeDeclaration> =
	parsedAttachmentsOf<d> & d["attachments"]

export type RawNodeDeclaration = {
	kind: NodeKind
	def: unknown
	normalizedDef: BaseMeta
	inner: BaseMeta
	reducibleTo: NodeKind
	prerequisite: any
	intersectionIsOpen: boolean
	childKind: NodeKind
	errorContext: BaseErrorContext | null
	attachments: object
}

export type ownIntersectionResult<d extends RawNodeDeclaration> =
	| Node<reducibleKindOf<d["kind"]>>
	| Disjoint

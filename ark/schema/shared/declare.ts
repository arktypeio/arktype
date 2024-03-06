import type { evaluate, listable, merge } from "@arktype/util"
import type { NarrowedAttachments, Node } from "../base.js"
import type { Disjoint } from "./disjoint.js"
import type { ConstraintKind, NodeKind } from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export const metaKeys: { [k in keyof BaseMeta]: 1 } = { description: 1 }

interface DeclarationInput {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	branchable?: true
	symmetricIntersectionIsOpen?: true
	childKind?: NodeKind
	reducibleTo?: NodeKind
	expectedContext?: object
	prerequisite?: unknown
}

export type BaseIntersectionResult = listable<Node> | Disjoint | null

export interface BaseExpectedContext<kind extends NodeKind = NodeKind> {
	code: kind
}

export type defaultExpectedContext<d extends DeclarationInput> = evaluate<
	BaseExpectedContext<d["kind"]> & { description: string } & d["inner"]
>

export type requireDescriptionIfPresent<t> = "description" extends keyof t
	? t & { description: string }
	: t

export type declareNode<
	d extends {
		[k in keyof d]: k extends keyof DeclarationInput
			? DeclarationInput[k]
			: never
	} & DeclarationInput
> = merge<
	{
		prerequisite: prerequisiteOf<d>
		childKind: never
		reducibleTo: d["kind"]
		expectedContext: null
		branchable: false
		symmetricIntersectionIsOpen: false
		intersection:
			| Node<
					| d["kind"]
					| (d["reducibleTo"] extends NodeKind ? d["reducibleTo"] : never)
			  >
			| Disjoint
			| (d["kind"] extends ConstraintKind ? null : never)
			| (d["branchable"] extends true ? Node<d["kind"]>[] : never)
	},
	d & {
		expectedContext: d["expectedContext"] extends {}
			? BaseExpectedContext<d["kind"]> &
					// description should always be populated if it's part of the context
					requireDescriptionIfPresent<d["expectedContext"]>
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
	intersection: BaseIntersectionResult
	symmetricIntersectionIsOpen: boolean
	branchable: boolean
	childKind: NodeKind
	expectedContext: BaseExpectedContext | null
}

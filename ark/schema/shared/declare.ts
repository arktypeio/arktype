import type { evaluate, merge } from "@arktype/util"
import type { NarrowedAttachments } from "../base.js"
import type {
	NodeKind,
	UnknownSymmetricIntersectionResult
} from "./implement.js"

export interface BaseMeta {
	readonly description?: string
}

export const metaKeys: { [k in keyof BaseMeta]: 1 } = { description: 1 }

interface DeclarationInput {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseMeta
	inner: BaseMeta
	symmetricIntersection: UnknownSymmetricIntersectionResult
	childKind?: NodeKind
	parsableTo?: NodeKind
	expectedContext?: object
	prerequisite?: unknown
}

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
		parsableTo: d["kind"]
		expectedContext: null
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
	parsableTo: NodeKind
	prerequisite: any
	symmetricIntersection: UnknownSymmetricIntersectionResult
	childKind: NodeKind
	expectedContext: BaseExpectedContext | null
}

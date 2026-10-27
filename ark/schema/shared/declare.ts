import type { merge, show } from "@ark/util"
import type { UnknownErrorConfigs } from "../config.ts"
import type { nodeOfKind, reducibleKindOf } from "../kinds.ts"
import type { Disjoint } from "./disjoint.ts"
import type { ArkErrorCode, ArkErrors } from "./errors.ts"
import type { NarrowedAttachments, NodeKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"

export interface DefaultArkEnv {
	meta(): {}
	onFail(errors: ArkErrors): ArkErrors
}

interface NodeMeta extends JsonSchema.UniversalMeta, UnknownErrorConfigs {
	alias?: string
	/** the flat alias of the builtin keyword whose phrase describes this node */
	keyword?: string
	/** the JSON Schema to write for this node in place of the one its constraints imply */
	jsonSchema?: JsonSchema
	onFail?: ArkErrors.Handler
}

declare global {
	export interface ArkEnv extends DefaultArkEnv {}

	export namespace ArkEnv {
		export type meta = show<NodeMeta & ReturnType<ArkEnv["meta"]>>

		export type onFail = ReturnType<ArkEnv["onFail"]>
	}
}

export type TypeMeta = Omit<ArkEnv.meta, "onFail">

export declare namespace TypeMeta {
	export type Collapsible<meta extends TypeMeta = TypeMeta> = meta | string

	export type Mapper<meta extends TypeMeta = TypeMeta> = (
		existing: Readonly<meta>
	) => meta

	export type MappableInput<meta extends TypeMeta = TypeMeta> =
		| Collapsible<meta>
		| Mapper<meta>

	export namespace MappableInput {
		export type Internal = MappableInput<ArkEnv.meta>
	}
}

export interface BaseNodeInput {
	readonly meta?: ArkEnv.meta | string
}

interface DeclarationInput {
	kind: NodeKind
	inner: object
	errorCtx?: BaseErrorContext
	reducibleTo?: NodeKind
	stacks?: true
	prerequisite?: unknown
	childKind?: NodeKind
}

export interface BaseErrorContext<
	code extends NodeKind | ArkErrorCode = NodeKind
> {
	readonly description?: string
	readonly code: code
	readonly meta: ArkEnv.meta
}

export type defaultErrorContext<d extends DeclarationInput> = show<
	BaseErrorContext<d["kind"]> & d["inner"]
>

export type declareNode<
	d extends {
		[k in keyof d]: k extends keyof DeclarationInput ? DeclarationInput[k]
		:	never
	} & DeclarationInput
> = merge<
	{
		stacks: false
		prerequisite: prerequisiteOf<d>
		childKind: never
		reducibleTo: d["kind"]
		errorCtx: null
	},
	d
>

type prerequisiteOf<d extends DeclarationInput> =
	"prerequisite" extends keyof d ? d["prerequisite"] : unknown

export type attachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> & attachedInner<d>

// some nonsense to allow TS to infer attache properties on nodes with
// a base declaration like Prop and Range
type attachedInner<d extends BaseNodeDeclaration> =
	"intersection" & d["kind"] extends never ? d["inner"] : {}

export interface BaseNodeDeclaration {
	kind: NodeKind
	inner: {}
	reducibleTo: NodeKind
	prerequisite: any
	stacks: boolean
	childKind: NodeKind
	errorCtx: BaseErrorContext | null
}

export type ownIntersectionResult<d extends BaseNodeDeclaration> =
	| nodeOfKind<reducibleKindOf<d["kind"]>>
	| Disjoint

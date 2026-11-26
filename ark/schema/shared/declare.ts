import type { merge, show } from "@ark/util"
import type { UnknownErrorConfigs } from "../config.ts"
import type { nodeOfKind, reducibleKindOf } from "../kinds.ts"
import type { Disjoint } from "./disjoint.ts"
import type { ArkErrorCode, ArkErrors } from "./errors.ts"
import type { NarrowedAttachments, NodeKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"

export interface DefaultArkEnv {
	/** the scope strings resolve against, where unknown is arktype's keywords */
	$(): unknown
}

interface NodeMeta extends JsonSchema.UniversalMeta, UnknownErrorConfigs {
	alias?: string
	/**
	 * what an error's default message calls the value, e.g. "Unit price" for
	 * "Unit price must be positive", in place of the key a summary writes
	 * before it. JSON Schema's `title` where none is set
	 */
	label?: string
	/** the flat alias of the builtin keyword whose phrase describes this node */
	keyword?: string
	/** the JSON Schema to write for this node in place of the one its constraints imply */
	jsonSchema?: JsonSchema
	onFail?: ArkErrors.Handler
	/**
	 * serialized as the `pattern` keyword of the generated JSON Schema
	 *
	 * ⚠️ does not affect validation (for that, use a regex definition like `type("/^$/")`)
	 */
	pattern?: string
}

/**
 * What a program declares for arktype, by augmenting the module it imports:
 *
 * declare module "arktype" {
 *     interface ArkEnv {
 *         meta(): { secretIngredient?: string }
 *     }
 * }
 *
 * A module's interface, not a global one, so each copy of arktype in a
 * program (a dependency's 2.x, or another 3.x) reads only what was declared
 * for it. A global would merge every copy's declarations into one, typing one
 * copy's strings with another's keywords and its calls with another's onFail.
 */
export interface ArkEnv extends DefaultArkEnv {
	prototypes(): never
}

export declare namespace ArkEnv {
	export type meta = show<
		NodeMeta & (ArkEnv extends { meta(...args: never): infer meta } ? meta : {})
	>

	export type onFail =
		ArkEnv extends { onFail(...args: never): infer result } ? result : ArkErrors

	/** what a call passes for its narrows and morphs to read as `ctx.context` */
	export type context =
		ArkEnv extends { context(...args: never): infer context } ? context : {}

	/** classes `.infer` leaves opaque */
	export type prototypes = ReturnType<ArkEnv["prototypes"]>
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

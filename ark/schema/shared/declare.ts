import type { Dict, evaluate, extend } from "@arktype/util"
import type { RefinementOperand } from "../refinements/refinement.js"
import type {
	CompiledAllows,
	CompiledMethods,
	Problems
} from "./compilation.js"
import type { ConstraintKind, NodeKind, RefinementKind } from "./define.js"
import type { Disjoint } from "./disjoint.js"
import type { rightOf } from "./intersect.js"

export type BaseAttributes = {
	readonly description?: string
}

export type withAttributes<o extends object> = extend<BaseAttributes, o>

export type BaseIntersectionMap = {
	[lKey in NodeKind]: evaluate<
		{
			[requiredKey in lKey]:
				| lKey
				| Disjoint
				| (lKey extends RefinementKind ? null : never)
		} & {
			[rKey in rightOf<lKey> | "default"]?:
				| lKey
				| Disjoint
				| (lKey extends ConstraintKind ? null : never)
		}
	>
}

export type InputData<kind extends NodeKind> = kind extends RefinementKind
	? RefinementOperand<kind>
	: unknown

export type Traversal<kind extends NodeKind> = (
	data: InputData<kind>,
	problems: Problems
) => void

export type NodeAttachments<kind extends NodeKind> = {
	traverse: Traversal<kind>
}

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	schema: unknown
	inner: BaseAttributes
	intersections: BaseIntersectionMap[kind]
	attach: NodeAttachments<kind>
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	attach: NodeAttachments<any>
}

export type validateNodeDeclaration<types, additionalKeys = never> = {
	[k in keyof DeclarationInput<any>]: types extends {
		kind: infer kind extends NodeKind
	}
		? DeclarationInput<kind>[k]
		: never
} & {
	[k in Exclude<
		keyof types,
		keyof BaseNodeDeclaration | additionalKeys
	>]?: never
}

export type declareNode<types extends validateNodeDeclaration<types>> = types

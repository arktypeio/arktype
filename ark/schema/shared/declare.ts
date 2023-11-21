import type { Dict, evaluate, extend } from "@arktype/util"
import type { ConstraintKind, NodeKind, RefinementKind } from "./define.js"
import type { Disjoint } from "./disjoint.js"
import type { rightOf } from "./intersect.js"

export type BaseAttributes = {
	readonly alias?: string
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

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	schema: unknown
	inner: BaseAttributes
	intersections: BaseIntersectionMap[kind]
	attach: Dict
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	attach: Dict
}

export type declareNode<
	types extends {
		[k in keyof DeclarationInput<any>]: types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>[k]
			: never
	} & { [k in Exclude<keyof types, keyof BaseNodeDeclaration>]?: never }
> = types

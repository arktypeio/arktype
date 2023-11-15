import type { Dict, evaluate, extend } from "@arktype/util"
import type { ConstraintKind } from "../constraints/constraint.ts"
import type { Disjoint } from "./disjoint.ts"
import type { rightOf } from "./intersect.ts"
import type { NodeKind } from "./node.ts"
import type { RuleKind } from "./rule.ts"

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
				| (lKey extends ConstraintKind ? null : never)
		} & {
			[rKey in rightOf<lKey> | "default"]?:
				| lKey
				| Disjoint
				| (lKey extends RuleKind ? null : never)
		}
	>
}

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	collapsedSchema?: unknown
	expandedSchema: BaseAttributes
	inner: BaseAttributes
	intersections: BaseIntersectionMap[kind]
	attach: Dict
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	collapsedSchema?: unknown
	expandedSchema: BaseAttributes
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	attach: Dict
}

export type declareNode<
	types extends {
		[k in keyof BaseNodeDeclaration]: types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>[k]
			: never
	} & { [k in Exclude<keyof types, keyof BaseNodeDeclaration>]?: never }
> = types

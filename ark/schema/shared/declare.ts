import type { Dict, evaluate, extend } from "@arktype/util"
import type { BaseNode } from "../node.js"
import type {
	ConstraintKind,
	NodeKind,
	RefinementKind,
	RootKind
} from "./define.js"
import type { Disjoint } from "./disjoint.js"
import type { rightOf } from "./intersect.js"
import type { Schema, SchemaParseContext, parentKindOf } from "./node.js"

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
	context?: Dict
	inner: BaseAttributes
	intersections: BaseIntersectionMap[kind]
	attach: Dict
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	context: BaseSchemaParseContext<any>
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	attach: Dict
}

export type BaseSchemaParseContextInput = {
	prereduced?: true
}

export type BaseSchemaParseContext<kind extends NodeKind> = extend<
	BaseSchemaParseContextInput,
	{
		schema: Schema<kind>
		parentContext:
			| SchemaParseContext<parentKindOf<kind>>
			// roots don't necessarily have parents, but refinements always will
			| (kind extends RootKind ? undefined : never)
		cls: typeof BaseNode
	}
>

export type declareNode<
	types extends {
		[k in keyof DeclarationInput<any>]: types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>[k]
			: never
	} & { [k in Exclude<keyof types, keyof BaseNodeDeclaration>]?: never }
> = types & { context: BaseSchemaParseContext<types["kind"]> }

import { Trait, type Dict, type evaluate, type extend } from "@arktype/util"
import type { NarrowedAttachments } from "../base.js"
import type { Declaration, OpenRefinementKind } from "../kinds.js"
import type { TraverseAllows } from "../scope.js"
import type { ConstraintKind, NodeKind, PropKind, SetKind } from "./define.js"
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
				| (lKey extends OpenRefinementKind ? null : never)
		} & {
			[rKey in rightOf<lKey> | "default"]?:
				| lKey
				| Disjoint
				| (lKey extends ConstraintKind ? null : never)
		}
	>
}

export type UnknownIntersections = {
	[rKey in NodeKind | "default"]?: NodeKind | Disjoint | null
}

export type DeclarationInput = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: BaseAttributes
	inner: Dict
	meta?: Dict
	checks?: unknown
	childKind?: NodeKind
	intersections: UnknownIntersections
}

type ParentsByKind = {
	[k in NodeKind]: {
		[pKind in NodeKind]: k extends Declaration<k>["childKind"] ? pKind : never
	}[NodeKind]
}

type parentKindOf<kind extends NodeKind> = ParentsByKind[kind]

export type declareNode<d extends DeclarationInput> = extend<
	d,
	{
		meta: "meta" extends keyof d
			? extend<BaseAttributes, d["meta"]>
			: BaseAttributes
		checks: "checks" extends keyof d ? d["checks"] : unknown
		childKind: "childKind" extends keyof d ? d["childKind"] : never
		parentKind: parentKindOf<d["kind"]>
	}
>

export type attachmentsOf<d extends BaseNodeDeclaration> =
	NarrowedAttachments<d> & d["inner"]

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	normalizedSchema: Dict & BaseAttributes
	meta: Dict & BaseAttributes
	inner: Dict
	checks: any
	childKind: NodeKind
	parentKind: SetKind | PropKind
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
}

export abstract class PrimitiveNode<
	d extends BaseNodeDeclaration
> extends Trait {
	abstract readonly condition: string
	abstract readonly negatedCondition: string
	abstract readonly traverseAllows: TraverseAllows<d["checks"]>
}

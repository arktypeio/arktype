import type { Dict, evaluate, extend } from "@arktype/util"
import type { NarrowedAttachments } from "../base.js"
import type {
	ConstraintKind,
	NodeKind,
	PropKind,
	RefinementKind,
	SetKind
} from "./define.js"
import type { Disjoint } from "./disjoint.js"
import type { rightOf } from "./intersect.js"
import type { Declaration } from "./nodes.js"

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

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	schema: unknown
	normalizedSchema: BaseAttributes
	inner: Dict
	meta?: Dict
	checks?: unknown
	childKind?: NodeKind
	intersections: BaseIntersectionMap[kind]
}

export type validateNodeDeclaration<d, additionalKeys = never> = {
	[k in keyof DeclarationInput<any>]: d extends {
		kind: infer kind extends NodeKind
	}
		? DeclarationInput<kind>[k]
		: never
} & {
	[k in Exclude<keyof d, keyof DeclarationInput<any> | additionalKeys>]?: never
}

type ParentsByKind = {
	[k in NodeKind]: {
		[pKind in NodeKind]: k extends Declaration<k>["childKind"] ? pKind : never
	}[NodeKind]
}

type parentKindOf<kind extends NodeKind> = ParentsByKind[kind]

export type declareNode<d extends validateNodeDeclaration<d>> = extend<
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

import { domainOf, printable, type Constructor } from "@arktype/util"
import type { Node } from "../base.js"
import type {
	AfterNode,
	BeforeNode,
	MaxLengthNode,
	MaxNode,
	MinLengthNode,
	MinNode
} from "../constraints/bounds.js"
import type { FoldState } from "../constraints/constraint.js"
import type { DivisorNode } from "../constraints/divisor.js"
import type { IndexNode } from "../constraints/index.js"
import type { OptionalNode } from "../constraints/optional.js"
import type { PatternNode } from "../constraints/pattern.js"
import type { PredicateNode } from "../constraints/predicate.js"
import type { ExtraneousKeyRestriction } from "../constraints/props.js"
import type { RequiredNode } from "../constraints/required.js"
import type { SequenceNode } from "../constraints/sequence.js"
import type { Inner } from "../kinds.js"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisKind } from "../shared/implement.js"
import { BaseBasis } from "./basis.js"
import type { DomainInner } from "./domain.js"
import type { IntersectionBasisKind } from "./intersection.js"
import type { MorphInner } from "./morph.js"
import type { ProtoInner } from "./proto.js"
import type { UnionChildKind } from "./union.js"

export type UnitSchema<value = unknown> = UnitInner<value>

export interface UnitInner<value = unknown> extends BaseMeta {
	readonly unit: value
}

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	normalizedSchema: UnitSchema
	inner: UnitInner
	composition: "primitive"
	disjoinable: true
	expectedContext: UnitInner
}>

export class UnitNode<t = unknown> extends BaseBasis<
	t,
	UnitDeclaration,
	typeof UnitNode
> {
	static implementation = this.implement({
		hasAssociatedError: true,
		keys: {
			unit: {
				preserveUndefined: true
			}
		},
		normalize: (schema) => schema,
		defaults: {
			description(inner) {
				return printable(inner.unit)
			}
		},
		intersectSymmetric: (l, r) => Disjoint.from("unit", l, r)
	})

	serializedValue: string = (this.json as any).unit
	traverseAllows = (data: unknown) => data === this.unit
	compiledCondition = `${jsData} === ${this.serializedValue}`
	compiledNegation = `${jsData} !== ${this.serializedValue}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	basisName = printable(this.unit)
	domain = domainOf(this.unit)

	foldIntersection(s: FoldState<"unit">) {
		return r.allows(this.unit)
			? this
			: Disjoint.from("assignability", this.unit, r)
	}
}

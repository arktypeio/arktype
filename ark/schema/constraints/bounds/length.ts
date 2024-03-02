import type { List } from "@arktype/util"
import { jsData } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import { BasePrimitiveConstraint, type FoldInput } from "../constraint.js"
import { BaseRange, type declareRange } from "./range.js"

export type LengthBoundKind = "minLength" | "maxLength"

type LengthBoundDeclaration<kind extends LengthBoundKind = LengthBoundKind> =
	declareRange<{
		kind: kind
		limit: number
		prerequisite: LengthBoundableData
	}>

export type LengthBoundableData = string | List

export type MinLengthDeclaration = LengthBoundDeclaration<"minLength">

export class MinLengthNode extends BaseRange<
	MinLengthDeclaration,
	typeof MinLengthNode
> {
	static implementation: nodeImplementationOf<MinLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? inner.limit === 0
							? "non-empty"
							: `more than length ${inner.limit}`
						: inner.limit === 1
						? "non-empty"
						: `at least length ${inner.limit}`
				},
				actual: (data) => `${data.length}`
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.limit
		: (data: LengthBoundableData) => data.length >= this.limit

	foldIntersection(into: FoldInput<"minLength">): undefined {
		if (
			into.basis?.domain !== "string" &&
			!into.basis?.extends(this.$.builtin.Array)
		) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.minLength = this.intersectSymmetric(into.minLength)
	}
}

export type MaxLengthDeclaration = LengthBoundDeclaration<"maxLength">

export class MaxLengthNode extends BaseRange<
	MaxLengthDeclaration,
	typeof MaxLengthNode
> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? `less than length ${inner.limit}`
						: `at most length ${inner.limit}`
				},
				actual: (data) => `${data.length}`
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.limit
		: (data: LengthBoundableData) => data.length <= this.limit

	foldIntersection(into: FoldInput<"maxLength">): Disjoint | undefined {
		if (
			into.basis?.domain !== "string" &&
			!into.basis?.extends(this.$.builtin.Array)
		) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.maxLength = this.intersectSymmetric(into.maxLength)
		if (into.minLength?.isStricterThan(this)) {
			return Disjoint.from("range", this, into.minLength)
		}
	}
}

export interface ExactLengthInner extends BaseMeta {
	readonly length: number
}

export type NormalizedExactLengthSchema = ExactLengthInner

export type ExactLengthSchema = NormalizedExactLengthSchema | number

export type ExactLengthDeclaration = declareNode<{
	kind: "exactLength"
	schema: ExactLengthSchema
	normalizedSchema: NormalizedExactLengthSchema
	inner: ExactLengthInner
	composition: "primitive"
	prerequisite: LengthBoundableData
	expectedContext: ExactLengthInner
	disjoinable: true
}>

export class ExactLengthNode extends BasePrimitiveConstraint<
	ExactLengthDeclaration,
	typeof ExactLengthNode
> {
	static implementation = this.implement({
		collapseKey: "length",
		keys: {
			length: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { length: schema } : schema,
		intersectSymmetric: (l, r) =>
			new Disjoint({
				"[length]": {
					unit: {
						l: l.$.parse("unit", { unit: l.length }),
						r: r.$.parse("unit", { unit: r.length })
					}
				}
			}),
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.length === 1
					? "an integer"
					: `a multiple of ${inner.length}`
			}
		}
	})

	traverseAllows = (data: LengthBoundableData) => data.length === this.length

	compiledCondition = `${jsData}.length === ${this.length}`
	compiledNegation = `${jsData}.length !== ${this.length}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	foldIntersection(into: FoldInput<"exactLength">): undefined {}
}

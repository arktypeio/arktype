import type { extend } from "@arktype/util"
import { In } from "../../io/compile.js"
import type { declareNode } from "../../shared/declare.js"
import { defineNode } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import { defineRefinement } from "../shared.js"

export type MinInner = extend<
	BoundInner,
	{
		readonly min: number
	}
>

export type MinSchema =
	| BoundLimit
	| extend<
			NormalizedBoundSchema,
			{
				readonly min: BoundLimit
			}
	  >

export type MinDeclaration = declareNode<{
	kind: "min"
	schema: MinSchema
	inner: MinInner
	intersections: {
		min: "min"
	}
	attach: BoundAttachments<"min">
}>

export const MinImplementation = defineNode({
	kind: "min",
	keys: {
		min: {
			parse: (_) => +_
		},
		exclusive: {}
	},
	intersections: {
		min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r)
	},
	normalize: (schema) => {
		const boundKind = getBoundKind(ctx.basis)
		return typeof schema === "object"
			? { ...schema, boundKind }
			: { min: schema, boundKind }
	},
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		const comparisonDescription =
			inner.boundKind === "date"
				? inner.exclusive
					? "after"
					: "at or after"
				: inner.exclusive
				  ? "more than"
				  : "at least"
		return `${comparisonDescription} ${inner.min}`
	},
	attach: (node) => {
		const comparator = `>${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.min}`,
			implicitBasis: node.cls.builtins[node.boundKind]
		}
	}
})

export type MaxInner = extend<
	BoundInner,
	{
		readonly max: number
	}
>

export type MaxSchema =
	| BoundLimit
	| extend<
			NormalizedBoundSchema,
			{
				readonly max: BoundLimit
			}
	  >

export type MaxDeclaration = declareNode<{
	kind: "max"
	schema: MaxSchema
	inner: MaxInner
	intersections: {
		max: "max"
		min: Disjoint | null
	}
	attach: BoundAttachments<"max">
}>

export const MaxImplementation = defineRefinement({
	kind: "max",
	keys: {
		max: {
			parse: (_) => +_
		},
		exclusive: {}
	},
	intersections: {
		max: (l, r) => (l.max > r.max || (l.max === r.max && l.exclusive) ? l : r),
		min: (l, r) =>
			l.max < r.min || (l.max === r.min && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	},
	normalize: (schema) => {
		const boundKind = getBoundKind(ctx.basis)
		return typeof schema === "object"
			? { ...schema, boundKind }
			: { max: schema, boundKind }
	},
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		const comparisonDescription =
			inner.boundKind === "date"
				? inner.exclusive
					? "before"
					: "at or before"
				: inner.exclusive
				  ? "less than"
				  : "at most"
		return `${comparisonDescription} ${inner.max}`
	},
	attach: (node) => {
		const comparator = `<${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.max}`,
			implicitBasis: node.cls.builtins[node.boundKind]
		}
	}
})

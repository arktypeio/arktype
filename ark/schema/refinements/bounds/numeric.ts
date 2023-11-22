import { In } from "../../io/compile.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { defineRefinement } from "../shared.js"
import {
	writeUnboundableMessage,
	type BoundAttachments,
	type BoundInner,
	type BoundSchema
} from "./shared.js"

export type MinDeclaration = declareNode<{
	kind: "min"
	schema: BoundSchema<"min", number>
	inner: BoundInner<"min", number>
	attach: BoundAttachments<"lower">
	intersections: {
		min: "min"
	}
}>

export const MinImplementation = defineRefinement({
	kind: "min",
	keys: {
		min: {},
		exclusive: {}
	},
	intersections: {
		min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r)
	},
	normalize: (schema) =>
		typeof schema === "object" ? schema : { min: schema },
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		return `${inner.exclusive ? "more than" : "at least"} ${inner.min}`
	},
	attach: (node) => {
		const comparator = `>${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.min}`,
			implicitBasis: node.cls.builtins.number
		}
	}
})

export type MaxDeclaration = declareNode<{
	kind: "max"
	schema: BoundSchema<"max", number>
	inner: BoundInner<"max", number>
	attach: BoundAttachments<"upper">
	intersections: {
		// TODO: Fix rightOf
		max: "max"
		min: Disjoint | null
	}
}>

export const MaxImplementation = defineRefinement({
	kind: "max",
	keys: {
		max: {},
		exclusive: {}
	},
	intersections: {
		max: (l, r) => (l.max > r.max || (l.max === r.max && l.exclusive) ? l : r),
		min: (l, r) =>
			l.max < r.min || (l.max === r.min && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	},
	normalize: (schema) =>
		typeof schema === "object" ? schema : { max: schema },
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		const comparisonDescription = inner.exclusive ? "less than" : "at most"
		return `${comparisonDescription} ${inner.max}`
	},
	attach: (node) => {
		const comparator = `<${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.max}`,
			implicitBasis: node.cls.builtins.number
		}
	}
})

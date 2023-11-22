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

export type MinLengthDeclaration = declareNode<{
	kind: "minLength"
	schema: BoundSchema<"minLength", number>
	inner: BoundInner<"minLength", number>
	attach: BoundAttachments<"lower">
	intersections: {
		minLength: "minLength"
	}
}>

export const MinLengthImplementation = defineRefinement({
	kind: "minLength",
	keys: {
		minLength: {},
		exclusive: {}
	},
	intersections: {
		minLength: (l, r) =>
			l.minLength > r.minLength || (l.minLength === r.minLength && l.exclusive)
				? l
				: r
	},
	normalize: (schema) =>
		typeof schema === "object" ? schema : { minLength: schema },
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		return `${inner.exclusive ? "more than" : "at least"} ${inner.minLength}`
	},
	attach: (node) => {
		const comparator = `>${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.minLength}`,
			// TODO: array?
			implicitBasis: node.cls.builtins.string
		}
	}
})

export type MaxLengthDeclaration = declareNode<{
	kind: "maxLength"
	schema: BoundSchema<"maxLength", number>
	inner: BoundInner<"maxLength", number>
	attach: BoundAttachments<"upper">
	intersections: {
		maxLength: "maxLength"
		minLength: Disjoint | null
	}
}>

export const MaxLengthImplementation = defineRefinement({
	kind: "maxLength",
	keys: {
		maxLength: {},
		exclusive: {}
	},
	intersections: {
		maxLength: (l, r) =>
			l.maxLength > r.maxLength || (l.maxLength === r.maxLength && l.exclusive)
				? l
				: r,
		minLength: (l, r) =>
			l.maxLength < r.minLength ||
			(l.maxLength === r.minLength && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	},
	normalize: (schema) =>
		typeof schema === "object" ? schema : { maxLength: schema },
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		const comparisonDescription = inner.exclusive ? "less than" : "at most"
		return `${comparisonDescription} ${inner.maxLength}`
	},
	attach: (node) => {
		const comparator = `<${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.maxLength}`,
			implicitBasis: node.cls.builtins.number
		}
	}
})

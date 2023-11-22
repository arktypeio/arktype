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

export type AfterDeclaration = declareNode<{
	kind: "after"
	schema: BoundSchema<"min", number>
	inner: BoundInner<"min", number>
	attach: BoundAttachments<"lower">
	intersections: {
		after: "after"
	}
}>

export type BeforeDeclaration = declareNode<{
	kind: "before"
	schema: BoundSchema<"before", number>
	inner: BoundInner<"before", number>
	attach: BoundAttachments<"upper">
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export const BeforeImplementation = defineRefinement({
	kind: "before",
	keys: {
		before: {},
		exclusive: {}
	},
	intersections: {
		before: (l, r) =>
			l.before > r.before || (l.before === r.before && l.exclusive) ? l : r,
		after: (l, r) =>
			l.before < r.after ||
			(l.before === r.after && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	},
	normalize: (schema) =>
		typeof schema === "object" ? schema : { before: schema },
	writeInvalidBasisMessage: writeUnboundableMessage,
	writeDefaultDescription: (inner) => {
		const comparisonDescription = inner.exclusive ? "before" : "at or before"
		return `${comparisonDescription} ${inner.before}`
	},
	attach: (node) => {
		const comparator = `<${node.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${node.before}`,
			implicitBasis: node.cls.builtins.date
		}
	}
})

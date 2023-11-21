import type { declareNode, withAttributes } from "../../shared/declare.js"
import { rootKinds, type RootKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Inner, Node, Schema } from "../../shared/node.js"
import type { RefinementAttachments } from "../refinement.js"
import { defineRefinement } from "../shared.js"
import type { PropKind } from "./prop.js"
import { writeInvalidPropsBasisMessage } from "./shared.js"

export type RequiredPropSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<RootKind>
}>

export type RequiredPropInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<RootKind>
}>

export type RequiredDeclaration = declareNode<{
	kind: "required"
	schema: RequiredPropSchema
	inner: RequiredPropInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	attach: RefinementAttachments<object>
}>

const intersectNamed = (
	l: Node<PropKind>,
	r: Node<PropKind>
): Inner<PropKind> | Disjoint | null => {
	if (l.key !== r.key) {
		return null
	}
	const required = l.key
	const value = l.value.intersect(r.value)
	if (value instanceof Disjoint) {
		return value
	}
	return {
		key: required,
		value
	}
}

export const RequiredImplementation = defineRefinement({
	kind: "required",
	keys: {
		key: {},
		value: {
			parse: (schema, ctx) => ctx.cls.parseSchema(rootKinds, schema, ctx)
		}
	},
	intersections: {
		required: intersectNamed,
		optional: intersectNamed
	},
	normalize: (schema) => schema,
	writeInvalidBasisMessage: writeInvalidPropsBasisMessage,
	writeDefaultDescription: (inner) => `${String(inner.key)}: ${inner.value}`,
	attach: (node) => ({
		implicitBasis: node.cls.builtins.object,
		condition: "true"
	})
})

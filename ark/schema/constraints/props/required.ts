import type { BasisKind } from "../../bases/basis.ts"
import type { declareNode, withAttributes } from "../../shared/declare.ts"
import { defineNode, rootKinds, type RootKind } from "../../shared/define.ts"
import { Disjoint } from "../../shared/disjoint.ts"
import type { Inner, Node, Schema } from "../../shared/node.ts"
import type { ConstraintAttachments } from "../constraint.ts"
import { getBasisName } from "../shared.ts"
import type { PropKind } from "./prop.ts"

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
	expandedSchema: RequiredPropSchema
	inner: RequiredPropInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	attach: ConstraintAttachments<object>
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

const writeInvalidBasisMessage = (basis: Node<BasisKind> | undefined) =>
	`Props may only be applied to an object basis (was ${getBasisName(basis)})`

export const RequiredImplementation = defineNode({
	kind: "required",
	keys: {
		key: {},
		value: {
			parse: (schema, ctx) => ctx.ctor.parseSchema(rootKinds, schema, ctx)
		}
	},
	intersections: {
		required: intersectNamed,
		optional: intersectNamed
	},
	normalize: (schema) => schema,
	writeDefaultDescription: (inner) => `${String(inner.key)}: ${inner.value}`,
	attach: (node) => ({
		implicitBasis: node.ctor.builtins.object,
		condition: "true"
	})
})

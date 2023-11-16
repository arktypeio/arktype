import type { declareNode, withAttributes } from "../../shared/declare.ts"
import { defineNode, rootKinds, type RootKind } from "../../shared/define.ts"
import { Disjoint } from "../../shared/disjoint.ts"
import type { Node, Schema } from "../../shared/node.ts"
import type { ConstraintAttachments } from "../constraint.ts"

export type OptionalPropInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<RootKind>
}>

export type OptionalPropSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<RootKind>
}>

export type OptionalDeclaration = declareNode<{
	kind: "optional"
	expandedSchema: OptionalPropSchema
	inner: OptionalPropInner
	intersections: {
		optional: "optional" | null
	}
	attach: ConstraintAttachments<object>
}>

export const OptionalImplementation = defineNode({
	kind: "optional",
	keys: {
		key: {},
		value: {
			children: rootKinds
		}
	},
	intersections: {
		optional: (l, r) => {
			if (l.key !== r.key) {
				return null
			}
			const optional = l.key
			const value = l.value.intersect(r.value)
			return {
				key: optional,
				value: value instanceof Disjoint ? l.ctor.builtins.never : value
			}
		}
	},
	expand: (schema) => schema as never,
	writeDefaultDescription: (inner) => `${String(inner.key)}?: ${inner.value}`,
	attach: (node) => ({
		implicitBasis: node.ctor.builtins.object,
		condition: "true"
	})
})

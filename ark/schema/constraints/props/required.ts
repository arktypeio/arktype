import type { BasisKind } from "../../bases/basis.ts"
import type { declareNode, withAttributes } from "../../shared/declare.ts"
import { defineNode, rootKinds, type RootKind } from "../../shared/define.ts"
import { Disjoint } from "../../shared/disjoint.ts"
import type { Node, Schema } from "../../shared/node.ts"
import type { ConstraintAttachments } from "../constraint.ts"
import { getBasisName } from "../shared.ts"

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
	}
	attach: ConstraintAttachments<object>
}>

const writeInvalidBasisMessage = (basis: Node<BasisKind> | undefined) =>
	`Props may only be applied to an object basis (was ${getBasisName(basis)})`

export const RequiredImplementation = defineNode({
	kind: "required",
	keys: {
		key: {},
		value: {
			children: rootKinds
		}
	},
	intersections: {
		required: (l, r) => {
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
	},
	expand: (schema) => schema as never,
	writeDefaultDescription: (inner) => `${String(inner.key)}: ${inner.value}`,
	attach: (node) => ({
		implicitBasis: node.ctor.builtins.object,
		condition: "true"
	})
})
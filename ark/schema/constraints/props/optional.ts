import type { declareNode, withAttributes } from "../../shared/declare.js"
import { rootKinds, type RootKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Node, Schema } from "../../shared/node.js"
import type { ConstraintAttachments } from "../constraint.js"
import { defineConstraint } from "../shared.js"
import { writeInvalidPropsBasisMessage } from "./shared.js"

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

export const OptionalImplementation = defineConstraint({
	kind: "optional",
	keys: {
		key: {},
		value: {
			parse: (schema, ctx) => ctx.cls.parseSchema(rootKinds, schema, ctx)
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
				value: value instanceof Disjoint ? l.cls.builtins.unknown : value
			}
		}
	},
	normalize: (schema) => schema,
	writeInvalidBasisMessage: writeInvalidPropsBasisMessage,
	writeDefaultDescription: (inner) => `${String(inner.key)}?: ${inner.value}`,
	attach: (node) => ({
		implicitBasis: node.cls.builtins.object,
		condition: "true"
	})
})

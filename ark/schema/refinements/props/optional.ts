import type { Node } from "../../base.js"
import { In, compileSerializedValue } from "../../shared/compilation.js"
import type { withAttributes } from "../../shared/declare.js"
import { typeKinds, type TypeKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Schema } from "../../shared/nodes.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "../shared.js"
import { compilePresentProp, type NamedPropAttachments } from "./shared.js"

export type OptionalInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}>

export type OptionalSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<TypeKind>
}>

export type OptionalDeclaration = declareRefinement<{
	kind: "optional"
	schema: OptionalSchema
	inner: OptionalInner
	intersections: {
		optional: "optional" | null
	}
	operand: object
	attach: NamedPropAttachments
}>

export const OptionalImplementation = defineRefinement({
	kind: "optional",
	keys: {
		key: {},
		value: {
			child: true,
			parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
		}
	},
	operand: ["object"],
	intersections: {
		optional: (l, r) => {
			if (l.key !== r.key) {
				return null
			}
			const optional = l.key
			const value = l.value.intersect(r.value)
			return {
				key: optional,
				value: value instanceof Disjoint ? l.scope.builtin.never : value
			}
		}
	},
	normalize: (schema) => schema,
	writeDefaultDescription: (inner) => `${String(inner.key)}?: ${inner.value}`,
	attach: (node) => {
		const serializedKey = compileSerializedValue(node.key)
		return {
			serializedKey,
			allows: (data) =>
				!(node.key in data) ||
				node.value.allows((data as Record<string | symbol, unknown>)[node.key]),
			compiledKey: typeof node.key === "string" ? node.key : serializedKey,
			assertValidBasis: createValidBasisAssertion(node)
		}
	},
	compile: (node, ctx) => `if(${node.serializedKey} in ${In}) {
		${compilePresentProp(node, ctx)}
	}`
})

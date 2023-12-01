import type { Node } from "../../base.js"
import { compileSerializedValue } from "../../shared/compilation.js"
import type { BaseAttributes, withAttributes } from "../../shared/declare.js"
import type { TypeKind } from "../../shared/define.js"
import type { Schema } from "../../shared/nodes.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "../shared.js"
import type { NamedPropAttachments } from "./shared.js"

export type OptionalInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type OptionalSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<TypeKind>
}>

export type OptionalDeclaration = declareRefinement<{
	kind: "optional"
	schema: OptionalSchema
	normalizedSchema: OptionalSchema
	inner: OptionalInner
	meta: BaseAttributes
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
	normalize: (schema) => schema,
	attach: (node) => {
		const serializedKey = compileSerializedValue(node.key)
		return {
			serializedKey,
			traverseAllows: (data, problems) =>
				!(node.key in data) ||
				node.value.traverseAllows((data as any)[node.key], problems),
			traverseApply: (data, problems) => {
				if (node.key in data) {
					node.value.traverseApply((data as any)[node.key], problems)
				}
			},
			compiledKey: typeof node.key === "string" ? node.key : serializedKey,
			assertValidBasis: createValidBasisAssertion(node)
		}
	}
})

// intersections: {
// 	optional: (l, r) => {
// 		if (l.key !== r.key) {
// 			return null
// 		}
// 		const optional = l.key
// 		const value = l.value.intersect(r.value)
// 		return {
// 			key: optional,
// 			value: value instanceof Disjoint ? l.scope.builtin.never : value
// 		}
// 	}
// },
// compile: (node, ctx) => `if(${node.serializedKey} in ${In}) {
// 	${compilePresentProp(node, ctx)}
// }`,
// writeDefaultDescription: (inner) => `${String(inner.key)}?: ${inner.value}`,

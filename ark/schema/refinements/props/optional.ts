import type { Node } from "../../base.js"
import { In, compileSerializedValue } from "../../shared/compilation.js"
import type { withAttributes } from "../../shared/declare.js"
import { schemaKinds, type SchemaKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Definition } from "../../shared/nodes.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "../shared.js"
import type { NamedPropAttachments } from "./shared.js"

export type OptionalInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<SchemaKind>
}>

export type OptionalDefinition = withAttributes<{
	readonly key: string | symbol
	readonly value: Definition<SchemaKind>
}>

export type OptionalDeclaration = declareRefinement<{
	kind: "optional"
	schema: OptionalDefinition
	inner: OptionalInner
	intersections: {
		optional: "optional" | null
	}
	operands: object
	attach: NamedPropAttachments
}>

export const OptionalImplementation = defineRefinement({
	kind: "optional",
	keys: {
		key: {},
		value: {
			parse: (schema, ctx) =>
				ctx.scope.parseSchemaFromKinds(schemaKinds, schema)
		}
	},
	operands: ["object"],
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
	writeDefaultDescription: (inner) => `${String(inner.key)}?: ${inner.value}`,
	attach: (node) => {
		const serializedKey = compileSerializedValue(node.key)
		return {
			serializedKey,
			compiledKey: typeof node.key === "string" ? node.key : serializedKey,
			assertValidBasis: createValidBasisAssertion(node)
		}
	},
	compile: (node, ctx) => `if(${node.serializedKey} in ${In}) {
		return ${node.value.compileInvocation(
			{
				...ctx,
				path: [...ctx.path, node.compiledKey]
			},
			node.compiledKey
		)}
	}`
})

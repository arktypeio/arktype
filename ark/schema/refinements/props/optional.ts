import { compilePropAccess, compileSerializedValue } from "../../io/compile.js"
import { In } from "../../shared/compilation.js"
import type { withAttributes } from "../../shared/declare.js"
import { rootKinds, type RootKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Node, Schema } from "../../shared/node.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "../shared.js"
import type { NamedPropAttachments } from "./shared.js"

export type OptionalPropInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<RootKind>
}>

export type OptionalPropSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<RootKind>
}>

export type OptionalDeclaration = declareRefinement<{
	kind: "optional"
	schema: OptionalPropSchema
	inner: OptionalPropInner
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
			parse: (schema, ctx) => ctx.cls.parseRootFromKinds(rootKinds, schema)
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
	attach: (node) => ({
		assertValidBasis: createValidBasisAssertion(node),
		serializedKey: compileSerializedValue(node.key)
	}),
	compile: (node, ctx) => `if(${node.serializedKey} in ${In}) {
		return ${
			node.value.compile({
				...ctx,
				path: [...ctx.path, node.serializedKey]
			}).reference
		}(${In}${compilePropAccess(
			typeof node.key === "string" ? node.key : node.serializedKey
		)})
	}`
})

import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf,
	type Constructor
} from "@arktype/util"
import {
	In,
	compilePrimitive,
	compileSerializedValue,
	composePrimitiveTraversal
} from "../shared/compilation.js"
import type { declareNode } from "../shared/declare.js"
import { defaultInnerKeySerializer, defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type ProtoInner<proto extends Constructor = Constructor> = {
	readonly proto: proto
}

export type ProtoSchema<proto extends Constructor = Constructor> =
	| proto
	| ProtoInner<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	schema: ProtoSchema
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
	attach: BasisAttachments<"proto">
}>

// // readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export const ProtoImplementation = defineNode({
	kind: "proto",
	collapseKey: "proto",
	innerKeys: {
		proto: {
			serialize: (constructor) =>
				getExactBuiltinConstructorName(constructor) ??
				defaultInnerKeySerializer(constructor)
		}
	},
	intersections: {
		proto: (l, r) =>
			constructorExtends(l.proto, r.proto)
				? l
				: constructorExtends(r.proto, l.proto)
				  ? r
				  : Disjoint.from("proto", l, r),
		domain: (l, r) =>
			r.domain === "object"
				? l
				: Disjoint.from("domain", l.scope.builtin.object, r)
	},
	normalize: (input) =>
		typeof input === "function" ? { proto: input } : input,
	writeDefaultDescription: (node) => {
		const knownObjectKind = getExactBuiltinConstructorName(node.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${node.proto.name}`
	},
	attach: (node) => {
		const condition = `${In} instanceof ${
			objectKindOf(node.proto) ?? compileSerializedValue(node.proto)
		}`
		const traverseAllows = (data: unknown) => data instanceof node.proto
		return {
			basisName: `${node.proto.name}`,
			traverseAllows,
			traverseApply: composePrimitiveTraversal(node, traverseAllows),
			domain: "object",
			condition,
			negatedCondition: `${condition} === false`
		}
	},
	compile: compilePrimitive
})

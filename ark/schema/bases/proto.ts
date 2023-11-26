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
	compileSerializedValue
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defaultInnerKeySerializer, defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type ProtoInner<proto extends Constructor = Constructor> =
	withAttributes<{
		readonly proto: proto
	}>

export type ProtoInput<proto extends Constructor = Constructor> =
	| proto
	| ProtoInner<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	definition: ProtoInput
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
	attach: BasisAttachments
}>

// // readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export const ProtoImplementation = defineNode({
	kind: "proto",
	collapseKey: "proto",
	keys: {
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
				: Disjoint.from("domain", l.space.builtin.object, r)
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
		return {
			basisName: `${node.proto.name}`,
			domain: "object",
			condition,
			negatedCondition: `${condition} === false`
		}
	},
	compile: compilePrimitive
})

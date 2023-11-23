import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf,
	type Constructor
} from "@arktype/util"
import { In, compileSerializedValue } from "../io/compile.js"
import { compilePrimitive } from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defaultInnerKeySerializer, defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type ProtoInner<proto extends Constructor = Constructor> =
	withAttributes<{
		readonly proto: proto
	}>

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
				: Disjoint.from("domain", l.cls.builtins.object, r)
	},
	normalize: (input) =>
		typeof input === "function" ? { proto: input } : input,
	writeDefaultDescription: (node) => {
		const knownObjectKind = getExactBuiltinConstructorName(node.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${node.proto.name}`
	},
	attach: (node) => ({
		basisName: `${node.proto.name}`,
		domain: "object",
		condition: `${In} instanceof ${
			objectKindOf(node.proto) ?? compileSerializedValue(node.proto)
		}`
	}),
	compile: compilePrimitive
})

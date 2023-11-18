import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf,
	type Constructor
} from "@arktype/util"
import { In, compileSerializedValue } from "../io/compile.ts"
import { builtins } from "../shared/builtins.ts"
import type { declareNode, withAttributes } from "../shared/declare.ts"
import { defineNode } from "../shared/define.ts"
import { Disjoint } from "../shared/disjoint.ts"
import type { BasisAttachments } from "./basis.ts"

export type ProtoInner<proto extends Constructor = Constructor> =
	withAttributes<{
		readonly proto: proto
	}>

export type ProtoSchema<proto extends Constructor = Constructor> =
	ProtoInner<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	collapsedSchema: Constructor
	expandedSchema: ProtoSchema
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
	attach: BasisAttachments
}>

// readonly knownObjectKind = objectKindOf(this.proto)
// readonly domain = "object"
// // readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export const ProtoImplementation = defineNode({
	kind: "proto",
	keys: {
		proto: {}
	},
	intersections: {
		proto: (l, r) =>
			constructorExtends(l.proto, r.proto)
				? l
				: constructorExtends(r.proto, l.proto)
				  ? r
				  : Disjoint.from("proto", l, r),
		domain: (l, r) =>
			r.domain === "object" ? l : Disjoint.from("domain", builtins().object, r)
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
	})
})

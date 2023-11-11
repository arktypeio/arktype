import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf
} from "@arktype/util"
import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import { builtins } from "../builtins.ts"
import { Disjoint } from "../disjoint.ts"
import { compileSerializedValue, In } from "../io/compile.ts"
import { type BasisAttachments } from "./basis.ts"

export type ProtoSchema<
	proto extends AbstractableConstructor = AbstractableConstructor
> = proto | ProtoInner

export type ProtoInner<
	proto extends AbstractableConstructor = AbstractableConstructor
> = withAttributes<{
	readonly proto: proto
}>

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

// readonly knownObjectKind = objectKindOf(this.proto)
// readonly domain = "object"
// readonly implicitBasis = this

// // readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export const ProtoImplementation = defineNode({
	kind: "proto",
	keys: {
		proto: "leaf"
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
	parseSchema: (schema) =>
		typeof schema === "function" ? { proto: schema } : schema,
	writeDefaultDescription: (inner) => {
		const knownObjectKind = getExactBuiltinConstructorName(inner.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${inner.proto.name}`
	},
	attach: (inner) => ({
		basisName: `${inner.proto.name}`,
		domain: "object",
		condition: `${In} instanceof ${
			objectKindOf(inner.proto) ?? compileSerializedValue(inner.proto)
		}`
	})
})

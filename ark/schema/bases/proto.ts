import {
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf,
	type Constructor
} from "@arktype/util"
import { In, compileSerializedValue } from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defaultValueSerializer } from "../shared/define.js"
import type { Disjoint } from "../shared/disjoint.js"
import { BaseType } from "../type.js"

export type ProtoInner<proto extends Constructor = Constructor> = {
	readonly proto: proto
}

export type NormalizedProtoSchema<proto extends Constructor = Constructor> =
	withAttributes<ProtoInner<proto>>

export type ProtoSchema<proto extends Constructor = Constructor> =
	| proto
	| NormalizedProtoSchema<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	schema: ProtoSchema
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
}>

// // readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export class ProtoNode<t = unknown> extends BaseType<t, typeof ProtoNode> {
	static declaration: ProtoDeclaration
	static parser = this.composeParser({
		kind: "proto",
		collapseKey: "proto",
		keys: {
			proto: {
				serialize: (constructor) =>
					getExactBuiltinConstructorName(constructor) ??
					defaultValueSerializer(constructor)
			}
		},
		normalize: (input) =>
			typeof input === "function" ? { proto: input } : input
	})

	readonly basisName = `${this.proto.name}`
	readonly domain = "object"
	readonly condition = `${In} instanceof ${
		objectKindOf(this.proto) ?? compileSerializedValue(this.proto)
	}`
	readonly negatedCondition = `${this.condition} === false`
	traverseAllows = (data: unknown) => data instanceof this.proto
	traverseApply = this.createPrimitiveTraversal()

	writeDefaultDescription() {
		const knownObjectKind = getExactBuiltinConstructorName(this.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${this.proto.name}`
	}
}

// intersections: {
// 	proto: (l, r) =>
// 		constructorExtends(l.proto, r.proto)
// 			? l
// 			: constructorExtends(r.proto, l.proto)
// 			  ? r
// 			  : Disjoint.from("proto", l, r),
// 	domain: (l, r) =>
// 		r.domain === "object"
// 			? l
// 			: Disjoint.from("domain", l.scope.builtin.object, r)
// },
// compile: compilePrimitive,

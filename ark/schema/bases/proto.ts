import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf
} from "@arktype/util"
import { type declareNode, defineNode, type withAttributes } from "../base.js"
import { builtins } from "../builtins.js"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"

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
}>

// readonly knownObjectKind = objectKindOf(this.proto)
// readonly basisName = `${this.proto.name}`
// readonly domain = "object"
// readonly implicitBasis = this

// // readonly literalKeys = prototypeKeysOf(this.rule.prototype)

// extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
// 	...constructors: constructors
// ) {
// 	return constructors.some((constructor) =>
// 		constructorExtends(this.proto, constructor)
// 	)
// }

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
	parseSchema: (schema) =>
		typeof schema === "function" ? { proto: schema } : schema,
	compileCondition: (inner) =>
		`${this.argName} instanceof ${
			objectKindOf(inner.proto) ?? compileSerializedValue(inner.proto)
		}`,
	writeDefaultDescription: (inner) => {
		const knownObjectKind = getExactBuiltinConstructorName(inner.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${inner.proto.name}`
	}
})

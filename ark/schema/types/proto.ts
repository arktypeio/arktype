import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	type Constructor
} from "@arktype/util"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import { defaultValueSerializer } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import { BaseBasis } from "./basis.js"

export type ProtoInner<proto extends Constructor = Constructor> = {
	readonly proto: proto
}

export type NormalizedProtoSchema<proto extends Constructor = Constructor> =
	withBaseMeta<ProtoInner<proto>>

export type ProtoSchema<proto extends Constructor = Constructor> =
	| proto
	| NormalizedProtoSchema<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	schema: ProtoSchema
	normalizedSchema: NormalizedProtoSchema
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
	error: {}
}>

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export class ProtoNode<t = unknown> extends BaseBasis<
	t,
	ProtoDeclaration,
	typeof ProtoNode
> {
	static implementation = this.implement({
		collapseKey: "proto",
		keys: {
			proto: {
				serialize: (constructor) =>
					getExactBuiltinConstructorName(constructor) ??
					defaultValueSerializer(constructor)
			}
		},
		normalize: (input) =>
			typeof input === "function" ? { proto: input } : input,
		defaults: {
			description(inner) {
				const knownObjectKind = getExactBuiltinConstructorName(inner.proto)
				return knownObjectKind
					? objectKindDescriptions[knownObjectKind]
					: `an instance of ${inner.proto.name}`
			}
			// describeActual(data) {
			// 	return objectKindOrDomainOf(data)
			// },
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
					: Disjoint.from("domain", l.$.builtin.object, r)
		}
	})

	readonly basisName = `${this.proto.name}`
	readonly serializedConstructor = (this.json as { proto: string }).proto
	readonly domain = "object"
	readonly compiledCondition = `${this.$.dataName} instanceof ${this.serializedConstructor}`
	readonly compiledNegation = `!(${this.compiledCondition})`
	traverseAllows = (data: unknown) => data instanceof this.proto
}

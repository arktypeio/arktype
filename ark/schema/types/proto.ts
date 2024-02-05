import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	type Constructor
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer } from "../shared/implement.js"
import { BaseBasis } from "./basis.js"
import type { DomainNode } from "./domain.js"

export interface ProtoInner<proto extends Constructor = Constructor>
	extends BaseMeta {
	readonly proto: proto
}

export type NormalizedProtoSchema<proto extends Constructor = Constructor> =
	ProtoInner<proto>

export type ProtoSchema<proto extends Constructor = Constructor> =
	| proto
	| NormalizedProtoSchema<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	schema: ProtoSchema
	normalizedSchema: NormalizedProtoSchema
	inner: ProtoInner
	composition: "primitive"
	disjoinable: true
}>

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export class ProtoNode<t = unknown> extends BaseBasis<
	t,
	ProtoDeclaration,
	typeof ProtoNode
> {
	static implementation = this.implement({
		hasAssociatedError: true,
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
			},
			actual(data) {
				return objectKindOrDomainOf(data)
			}
		}
	})

	readonly basisName = `${this.proto.name}`
	readonly serializedConstructor = (this.json as { proto: string }).proto
	readonly domain = "object"
	traverseAllows = (data: unknown) => data instanceof this.proto

	compiledCondition = `${this.$.dataArg} instanceof ${this.serializedConstructor}`
	compiledNegation = `!(${this.compiledCondition})`

	protected intersectOwnInner(r: ProtoNode) {
		return constructorExtends(this.proto, r.proto)
			? this
			: constructorExtends(r.proto, this.proto)
			? r
			: Disjoint.from("proto", this, r)
	}

	intersectRightwardInner(r: DomainNode): ProtoInner | Disjoint {
		return r.domain === "object"
			? this
			: Disjoint.from("domain", this.$.builtin.object, r)
	}
}

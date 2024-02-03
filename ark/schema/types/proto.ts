import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	type Constructor
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	defaultValueSerializer,
	type PrimitiveAttachmentsInput
} from "../shared/implement.js"
import { BaseType, type BaseBasis } from "./type.js"

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
	attachments: PrimitiveAttachmentsInput
}>

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export class ProtoNode<t = unknown>
	extends BaseType<t, ProtoDeclaration, typeof ProtoNode>
	implements BaseBasis
{
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
		},
		attachments: (base) => {
			const compiledCondition = `${base.$.dataArg} instanceof ${
				(base.json as any).proto
			}`
			return {
				primitive: true,
				compiledCondition,
				compiledNegation: `!(${compiledCondition})`
			}
		}
	})

	readonly constraintGroup = "basis"
	readonly basisName = `${this.proto.name}`
	readonly serializedConstructor = (this.json as { proto: string }).proto
	readonly domain = "object"
	traverseAllows = (data: unknown) => data instanceof this.proto

	// TODO:
	// domain: (l, r) =>
	// r.domain === "object"
	// 	? l
	// 	: Disjoint.from("domain", l.$.builtin.object, r)

	protected intersectOwnInner(r: ProtoNode) {
		return constructorExtends(this.proto, r.proto)
			? this
			: constructorExtends(r.proto, this.proto)
			? r
			: Disjoint.from("proto", this, r)
	}
}

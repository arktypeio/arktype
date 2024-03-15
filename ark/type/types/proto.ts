import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	type Constructor
} from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { TraverseAllows } from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer } from "../shared/implement.js"
import { BaseBasis } from "./basis.js"

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
	errorContext: ProtoInner
}>

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export class ProtoNode<t = any, $ = any> extends BaseBasis<
	t,
	ProtoDeclaration,
	$
> {
	static implementation = this.implement({
		hasAssociatedError: true,
		collapsibleKey: "proto",
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
			description(node) {
				const knownObjectKind = getExactBuiltinConstructorName(node.proto)
				return knownObjectKind
					? objectKindDescriptions[knownObjectKind]
					: `an instance of ${node.proto.name}`
			},
			actual(data) {
				return objectKindOrDomainOf(data)
			}
		},
		intersections: {
			proto: (l, r) =>
				constructorExtends(l.proto, r.proto)
					? l
					: constructorExtends(r.proto, l.proto)
					? r
					: Disjoint.from("proto", l, r),
			domain: (proto, domain) =>
				domain.domain === "object"
					? proto
					: // TODO: infer node to avoid cast
					  Disjoint.from("domain", proto.$.keywords.object as never, domain)
		}
	})

	traverseAllows: TraverseAllows = (data) => data instanceof this.proto

	readonly expression = `${this.proto.name}`
	readonly serializedConstructor = (this.json as { proto: string }).proto
	readonly domain = "object"

	readonly compiledCondition = `${jsData} instanceof ${this.serializedConstructor}`
	readonly compiledNegation = `!(${this.compiledCondition})`

	readonly errorContext = this.createErrorContext(this.inner)
}

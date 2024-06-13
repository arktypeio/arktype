import {
	builtinConstructors,
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	prototypeKeysOf,
	type BuiltinObjectKind,
	type Constructor,
	type Key,
	type array
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoints } from "../shared/disjoint.js"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { RawBasis } from "./basis.js"
import type { DomainNode } from "./domain.js"

export interface ProtoInner<proto extends Constructor = Constructor>
	extends BaseMeta {
	readonly proto: proto
}

export type NormalizedProtoSchema<proto extends Constructor = Constructor> =
	ProtoInner<proto>

export type ProtoReference = Constructor | BuiltinObjectKind

export interface ExpandedProtoSchema<
	proto extends ProtoReference = ProtoReference
> extends BaseMeta {
	readonly proto: proto
}

export type ProtoSchema<proto extends ProtoReference = ProtoReference> =
	| proto
	| ExpandedProtoSchema<proto>

export interface ProtoDeclaration
	extends declareNode<{
		kind: "proto"
		schema: ProtoSchema
		normalizedSchema: NormalizedProtoSchema
		inner: ProtoInner
		errorContext: ProtoInner
	}> {}

export const protoImplementation: nodeImplementationOf<ProtoDeclaration> =
	implementNode<ProtoDeclaration>({
		kind: "proto",
		hasAssociatedError: true,
		collapsibleKey: "proto",
		keys: {
			proto: {
				serialize: ctor =>
					getExactBuiltinConstructorName(ctor) ?? defaultValueSerializer(ctor)
			}
		},
		normalize: schema =>
			typeof schema === "string" ? { proto: builtinConstructors[schema] }
			: typeof schema === "function" ? { proto: schema }
			: typeof schema.proto === "string" ?
				{ ...schema, proto: builtinConstructors[schema.proto] }
			:	(schema as ExpandedProtoSchema<Constructor>),
		defaults: {
			description: node =>
				node.builtinName ?
					objectKindDescriptions[node.builtinName]
				:	`an instance of ${node.proto.name}`,
			actual: data => objectKindOrDomainOf(data)
		},
		intersections: {
			proto: (l, r) =>
				constructorExtends(l.proto, r.proto) ? l
				: constructorExtends(r.proto, l.proto) ? r
				: Disjoints.from("proto", l, r),
			domain: (proto, domain, ctx) =>
				domain.domain === "object" ?
					proto
				:	Disjoints.from(
						"domain",
						ctx.$.keywords.object.raw as DomainNode,
						domain
					)
		}
	})

export class ProtoNode extends RawBasis<ProtoDeclaration> {
	builtinName: BuiltinObjectKind | null = getExactBuiltinConstructorName(
		this.proto
	)
	serializedConstructor: string = (this.json as { proto: string }).proto
	compiledCondition = `data instanceof ${this.serializedConstructor}`
	compiledNegation = `!(${this.compiledCondition})`
	literalKeys: array<Key> = prototypeKeysOf(this.proto.prototype)

	traverseAllows: TraverseAllows = data => data instanceof this.proto
	expression: string = this.proto.name
	readonly domain = "object"

	get shortDescription(): string {
		return this.description
	}
}

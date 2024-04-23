import {
	type BuiltinObjectKind,
	type Constructor,
	type Key,
	type array,
	builtinObjectKinds,
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	prototypeKeysOf
} from "@arktype/util"
import type { RawSchemaAttachments } from "../schema.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	type PrimitiveAttachments,
	defaultValueSerializer,
	derivePrimitiveAttachments,
	implementNode
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { RawBasis } from "./basis.js"

export interface ProtoInner<proto extends Constructor = Constructor>
	extends BaseMeta {
	readonly proto: proto
}

export type NormalizedProtoDef<proto extends Constructor = Constructor> =
	ProtoInner<proto>

export type ProtoReference = Constructor | BuiltinObjectKind

export interface ExpandedProtoDef<proto extends ProtoReference = ProtoReference>
	extends BaseMeta {
	readonly proto: proto
}

export type ProtoDef<proto extends ProtoReference = ProtoReference> =
	| proto
	| ExpandedProtoDef<proto>

export interface ProtoAttachments
	extends RawSchemaAttachments<ProtoDeclaration>,
		PrimitiveAttachments<ProtoDeclaration> {
	readonly serializedConstructor: string
	readonly builtinName: BuiltinObjectKind | null
	readonly domain: "object"
	readonly literalKeys: array<Key>
}

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	def: ProtoDef
	normalizedDef: NormalizedProtoDef
	inner: ProtoInner
	errorContext: ProtoInner
	attachments: ProtoAttachments
}>

export const protoImplementation = implementNode<ProtoDeclaration>({
	kind: "proto",
	hasAssociatedError: true,
	collapsibleKey: "proto",
	keys: {
		proto: {
			serialize: (ctor) =>
				getExactBuiltinConstructorName(ctor) ?? defaultValueSerializer(ctor)
		}
	},
	normalize: (def) =>
		typeof def === "string" ? { proto: builtinObjectKinds[def] }
		: typeof def === "function" ? { proto: def }
		: typeof def.proto === "string" ?
			{ ...def, proto: builtinObjectKinds[def.proto] }
		:	(def as ExpandedProtoDef<Constructor>),
	defaults: {
		description: (node) =>
			node.builtinName ?
				objectKindDescriptions[node.builtinName]
			:	`an instance of ${node.proto.name}`,
		actual: (data) => objectKindOrDomainOf(data)
	},
	intersections: {
		proto: (l, r) =>
			constructorExtends(l.proto, r.proto) ? l
			: constructorExtends(r.proto, l.proto) ? r
			: Disjoint.from("proto", l, r),
		domain: (proto, domain, ctx) =>
			domain.domain === "object" ?
				proto
			:	Disjoint.from("domain", ctx.$.keywords.object as never, domain)
	},
	construct: (self): ProtoDeclaration["attachments"] => {
		const builtinName = getExactBuiltinConstructorName(self.proto)
		const serializedConstructor = (self.json as { proto: string }).proto
		const compiledCondition = `data instanceof ${serializedConstructor}`
		const literalKeys = prototypeKeysOf(self.proto.prototype)
		return derivePrimitiveAttachments<ProtoDeclaration>({
			builtinName,
			traverseAllows: (data) => data instanceof self.proto,
			expression: self.proto.name,
			serializedConstructor,
			domain: "object",
			compiledCondition,
			compiledNegation: `!(${compiledCondition})`,
			literalKeys,
			rawKeyOf() {
				return this.$.units(literalKeys)
			}
		})
	}
})

export class ProtoNode extends RawBasis<ProtoDeclaration> {
	builtinName = getExactBuiltinConstructorName(this.proto)
	serializedConstructor = (this.json as { proto: string }).proto
	compiledCondition = `data instanceof ${this.serializedConstructor}`
	compiledNegation = `!(${this.compiledCondition})`
	literalKeys = prototypeKeysOf(this.proto.prototype)

	traverseAllows: TraverseAllows = (data) => data instanceof this.proto
	expression = this.proto.name
	readonly domain = "object"
}

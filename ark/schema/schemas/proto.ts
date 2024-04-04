import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	prototypeKeysOf,
	type Constructor,
	type Key,
	type array
} from "@arktype/util"
import { implementNode } from "../base.js"
import { tsKeywords } from "../keywords/tsKeywords.js"
import type { errorContext } from "../kinds.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer } from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseBasis } from "./basis.js"

export interface ProtoInner<proto extends Constructor = Constructor>
	extends BaseMeta {
	readonly proto: proto
}

export type NormalizedProtoDef<proto extends Constructor = Constructor> =
	ProtoInner<proto>

export type ProtoDef<proto extends Constructor = Constructor> =
	| proto
	| NormalizedProtoDef<proto>

export interface ProtoAttachments {
	traverseAllows: TraverseAllows
	readonly expression: string
	readonly serializedConstructor: string
	readonly domain: "object"
	readonly compiledCondition: string
	readonly compiledNegation: string
	readonly errorContext: errorContext<"proto">
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
			serialize: (constructor) =>
				getExactBuiltinConstructorName(constructor) ??
				defaultValueSerializer(constructor)
		}
	},
	normalize: (def) => (typeof def === "function" ? { proto: def } : def),
	defaults: {
		description: (node) => {
			const knownObjectKind = getExactBuiltinConstructorName(node.proto)
			return knownObjectKind
				? objectKindDescriptions[knownObjectKind]
				: `an instance of ${node.proto.name}`
		},
		actual: (data) => objectKindOrDomainOf(data)
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
					Disjoint.from("domain", tsKeywords.object as never, domain)
	},
	attach: (self) => {
		const serializedConstructor = (self.json as { proto: string }).proto
		const compiledCondition = `data instanceof ${serializedConstructor}`
		return {
			traverseAllows: (data) => data instanceof self.proto,
			expression: self.proto.name,
			serializedConstructor,
			domain: "object",
			compiledCondition,
			compiledNegation: `!(${compiledCondition})`,
			literalKeys: prototypeKeysOf(self.proto.prototype),
			errorContext: {
				code: "proto",
				description: self.description,
				...self.inner
			}
		}
	}
})

export class ProtoNode<t = any, $ = any> extends BaseBasis<
	t,
	$,
	ProtoDeclaration
> {
	static implementation = protoImplementation

	traverseAllows: TraverseAllows = (data) => data instanceof this.proto

	readonly expression = `${this.proto.name}`
	readonly serializedConstructor = (this.json as { proto: string }).proto
	readonly domain = "object"

	readonly compiledCondition = `data instanceof ${this.serializedConstructor}`
	readonly compiledNegation = `!(${this.compiledCondition})`

	readonly errorContext = this.createErrorContext(this.inner)
	readonly literalKeys = prototypeKeysOf(this.proto.prototype)
}

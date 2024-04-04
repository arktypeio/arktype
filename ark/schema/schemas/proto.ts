import {
	type Constructor,
	type Key,
	type array,
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOrDomainOf,
	prototypeKeysOf
} from "@arktype/util"
import { type Schema, implementNode } from "../base.js"
import { tsKeywords } from "../keywords/tsKeywords.js"
import type { errorContext } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer } from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import type { BaseSchema } from "./schema.js"

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
	rawKeyOf(): Schema
	traverseApply: TraverseApply
	compile(js: NodeCompiler): void
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
				getExactBuiltinConstructorName(ctor) ??
				defaultValueSerializer(ctor)
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
	attach: (self): ProtoDeclaration["attachments"] => {
		const serializedConstructor = (self.json as { proto: string }).proto
		const compiledCondition = `data instanceof ${serializedConstructor}`
		const literalKeys = prototypeKeysOf(self.proto.prototype)
		const traverseAllows: TraverseAllows = (data) =>
			data instanceof self.proto
		const errorContext = {
			code: "proto",
			description: self.description,
			...self.inner
		} as const
		return {
			traverseAllows,
			expression: self.proto.name,
			serializedConstructor,
			domain: "object",
			compiledCondition,
			compiledNegation: `!(${compiledCondition})`,
			literalKeys,
			errorContext,
			rawKeyOf: () => self.$.units(literalKeys),
			traverseApply: (data, ctx) => {
				if (!traverseAllows(data, ctx)) {
					ctx.error(errorContext as never)
				}
			},
			compile: (js) => js.compilePrimitive(self as never)
		}
	}
})

export type ProtoNode<t = any, $ = any> = BaseSchema<t, $, ProtoDeclaration>

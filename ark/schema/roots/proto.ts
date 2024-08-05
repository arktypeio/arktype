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
} from "@ark/util"
import type {
	BaseErrorContext,
	BaseInner,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { InternalBasis } from "./basis.js"
import type { Domain } from "./domain.js"

export namespace Proto {
	export type Reference = Constructor | BuiltinObjectKind

	export type Schema<proto extends Reference = Reference> =
		| proto
		| ExpandedSchema<proto>

	export interface NormalizedSchema<proto extends Constructor = Constructor>
		extends BaseNormalizedSchema {
		readonly proto: proto
	}

	export interface ExpandedSchema<proto extends Reference = Reference>
		extends BaseInner {
		readonly proto: proto
	}

	export interface Inner<proto extends Constructor = Constructor>
		extends BaseInner {
		readonly proto: proto
	}

	export interface ErrorContext extends BaseErrorContext<"proto">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "proto"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			errorContext: ErrorContext
		}> {}

	export type Node = ProtoNode
}

const implementation: nodeImplementationOf<Proto.Declaration> =
	implementNode<Proto.Declaration>({
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
			:	(schema as Proto.ExpandedSchema<Constructor>),
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
				: Disjoint.init("proto", l, r),
			domain: (proto, domain) =>
				domain.domain === "object" ?
					proto
				:	Disjoint.init(
						"domain",
						$ark.intrinsic.object.internal as Domain.Node,
						domain
					)
		}
	})

export class ProtoNode extends InternalBasis<Proto.Declaration> {
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

export const Proto = {
	implementation,
	Node: ProtoNode
}

import {
	builtinConstructors,
	constructorExtends,
	getBuiltinNameOfConstructor,
	objectKindDescriptions,
	objectKindOrDomainOf,
	throwParseError,
	type BuiltinObjectKind,
	type Constructor
} from "@ark/util"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { isNode } from "../shared/utils.ts"
import { InternalBasis } from "./basis.ts"
import type { Domain } from "./domain.ts"

export declare namespace Proto {
	export type Reference = Constructor | BuiltinObjectKind

	export type Schema<proto extends Reference = Reference> =
		| proto
		| ExpandedSchema<proto>

	export interface NormalizedSchema<proto extends Constructor = Constructor>
		extends BaseNormalizedSchema {
		readonly proto: proto
	}

	export interface ExpandedSchema<proto extends Reference = Reference> {
		readonly proto: proto
	}

	export interface Inner<proto extends Constructor = Constructor> {
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
					getBuiltinNameOfConstructor(ctor) ?? defaultValueSerializer(ctor)
			}
		},
		normalize: schema =>
			typeof schema === "string" ? { proto: builtinConstructors[schema] }
			: typeof schema === "function" ?
				isNode(schema) ? (schema as {} as ProtoNode)
				:	{ proto: schema }
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
	builtinName: BuiltinObjectKind | null = getBuiltinNameOfConstructor(
		this.proto
	)
	serializedConstructor: string = (this.json as { proto: string }).proto
	compiledCondition = `data instanceof ${this.serializedConstructor}`
	compiledNegation = `!(${this.compiledCondition})`

	protected innerToJsonSchema(): JsonSchema.Array {
		switch (this.builtinName) {
			case "Array":
				return {
					type: "array"
				}
			default:
				return throwParseError(
					JsonSchema.writeUnjsonifiableMessage(this.description)
				)
		}
	}

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

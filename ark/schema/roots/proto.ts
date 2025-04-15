import {
	builtinConstructors,
	constructorExtends,
	domainOf,
	getBuiltinNameOfConstructor,
	hasKey,
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
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { ToJsonSchema } from "../shared/toJsonSchema.ts"
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
		readonly dateAllowsInvalid?: boolean
	}

	export interface ExpandedSchema<proto extends Reference = Reference> {
		readonly proto: proto
		readonly dateAllowsInvalid?: boolean
	}

	export interface Inner<proto extends Constructor = Constructor> {
		readonly proto: proto
		readonly dateAllowsInvalid?: boolean
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
			},
			dateAllowsInvalid: {}
		},
		normalize: schema => {
			const normalized: Proto.NormalizedSchema<Constructor> =
				typeof schema === "string" ? { proto: builtinConstructors[schema] }
				: typeof schema === "function" ?
					isNode(schema) ? (schema as {} as ProtoNode)
					:	{ proto: schema }
				: typeof schema.proto === "string" ?
					{ ...schema, proto: builtinConstructors[schema.proto] }
				:	(schema as never)
			if (typeof normalized.proto !== "function")
				throwParseError(Proto.writeInvalidSchemaMessage(normalized.proto))

			if (hasKey(normalized, "dateAllowsInvalid") && normalized.proto !== Date)
				throwParseError(Proto.writeBadInvalidDateMessage(normalized.proto))
			return normalized
		},
		applyConfig: (schema, config) => {
			if (
				schema.dateAllowsInvalid === undefined &&
				schema.proto === Date &&
				config.dateAllowsInvalid
			)
				return { ...schema, dateAllowsInvalid: true }
			return schema
		},
		defaults: {
			description: node =>
				node.builtinName ?
					objectKindDescriptions[node.builtinName]
				:	`an instance of ${node.proto.name}`,
			actual: data =>
				data instanceof Date && data.toString() === "Invalid Date" ?
					"an invalid Date"
				:	objectKindOrDomainOf(data)
		},
		intersections: {
			proto: (l, r) =>
				l.proto === Date && r.proto === Date ?
					// since l === r is handled by default,
					// exactly one of l or r must have allow invalid dates
					l.dateAllowsInvalid ?
						r
					:	l
				: constructorExtends(l.proto, r.proto) ? l
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

	private readonly requiresInvalidDateCheck =
		this.proto === Date && !this.dateAllowsInvalid

	traverseAllows: TraverseAllows =
		this.requiresInvalidDateCheck ?
			data => data instanceof Date && data.toString() !== "Invalid Date"
		:	data => data instanceof this.proto

	compiledCondition = `data instanceof ${this.serializedConstructor}${this.requiresInvalidDateCheck ? ` && data.toString() !== "Invalid Date"` : ""}`
	compiledNegation = `!(${this.compiledCondition})`

	protected innerToJsonSchema(ctx: ToJsonSchema.Context): JsonSchema {
		switch (this.builtinName) {
			case "Array":
				return {
					type: "array"
				}
			case "Date":
				return (
					ctx.fallback.date?.({ base: {} }) ??
					ctx.fallback.proto({ base: {}, proto: this.proto })
				)
			default:
				return ctx.fallback.proto({ base: {}, proto: this.proto })
		}
	}

	expression: string =
		this.dateAllowsInvalid ? "Date | InvalidDate" : this.proto.name

	get nestableExpression(): string {
		return this.dateAllowsInvalid ? `(${this.expression})` : this.expression
	}

	readonly domain = "object"

	get defaultShortDescription(): string {
		return this.description
	}
}

export const Proto = {
	implementation,
	Node: ProtoNode,
	writeBadInvalidDateMessage: (actual: Constructor): string =>
		`dateAllowsInvalid may only be specified with constructor Date (was ${actual.name})`,
	writeInvalidSchemaMessage: (actual: unknown): string =>
		`instanceOf operand must be a function (was ${domainOf(actual)})`
}

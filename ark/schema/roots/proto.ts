import {
	domainOf,
	functionNameOf,
	getBuiltinNameOfConstructor,
	isArray,
	isValidDate,
	timeOf,
	objectKindDescriptions,
	throwParseError,
	type BuiltinObjectKind,
	type Constructor
} from "@ark/util"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { registeredReference } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { InternalBasis } from "./basis.ts"

export declare namespace Proto {
	export type Reference = Constructor | BuiltinObjectKind

	export interface Inner<proto extends Constructor = Constructor> {
		readonly proto: proto
		readonly dateAllowsInvalid?: boolean
	}

	export interface ErrorContext extends BaseErrorContext<"proto">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "proto"
			inner: Inner
			errorContext: ErrorContext
		}> {}

	export type Node = ProtoNode
}

const implementation: nodeImplementationOf<Proto.Declaration> =
	implementNode<Proto.Declaration>({
		kind: "proto",
		ownsError: true,
		collapseKey: "proto",
		keys: {
			proto: {
				serialize: ctor =>
					getBuiltinNameOfConstructor(ctor) ?? registeredReference(ctor)
			},
			dateAllowsInvalid: {}
		},
		// like a number's options, set only where it or config allows
		applyConfig: (inner, config) => {
			if (inner.proto !== Date) return inner
			const { dateAllowsInvalid, ...rest } = inner
			const allowsInvalid = dateAllowsInvalid ?? config.dateAllowsInvalid
			return allowsInvalid || config.dateAllowsInvalid ?
					{ ...rest, dateAllowsInvalid: allowsInvalid }
				:	rest
		},
		defaults: {
			description: node => {
				const builtinName = getBuiltinNameOfConstructor(node.proto)
				return builtinName ?
						objectKindDescriptions[builtinName]
					:	`an instance of ${functionNameOf(node.proto)}`
			}
		}
	})

export class ProtoNode extends InternalBasis<Proto.Declaration> {
	constructor(...args: ConstructorParameters<typeof InternalBasis>) {
		super(...args)
		if (typeof this.proto !== "function")
			throwParseError(Proto.writeInvalidSchemaMessage(this.proto))
		if (this.dateAllowsInvalid !== undefined && this.proto !== Date)
			throwParseError(Proto.writeBadInvalidDateMessage(this.proto))
	}

	builtinName: BuiltinObjectKind | null = getBuiltinNameOfConstructor(
		this.proto
	)
	private readonly requiresInvalidDateCheck =
		this.proto === Date && !this.dateAllowsInvalid

	// Array.isArray is realm-safe; `instanceof Array` rejects arrays from other
	// windows/vm contexts (https://github.com/arktypeio/arktype/issues/1597).
	private readonly isArrayProto = this.proto === Array

	// Date.prototype's methods throw on an object only inheriting it
	traverseAllows: TraverseAllows =
		this.requiresInvalidDateCheck ?
			data => data instanceof Date && isValidDate(data)
		: this.proto === Date ?
			data => data instanceof Date && timeOf(data) !== undefined
		: this.isArrayProto ? data => isArray(data)
		: data => data instanceof this.proto

	compileCondition(js: NodeCompiler, data: string): string {
		return (
			this.requiresInvalidDateCheck ?
				`${data} instanceof Date && ${js.ref(isValidDate)}(${data})`
			: this.proto === Date ?
				`${data} instanceof Date && ${js.ref(timeOf)}(${data}) !== undefined`
			: this.isArrayProto ? `Array.isArray(${data})`
			: `${data} instanceof ${this.builtinName ?? js.ref(this.proto)}`
		)
	}

	expression: string =
		this.dateAllowsInvalid ? "Date | InvalidDate" : functionNameOf(this.proto)

	get nestedExpression(): string {
		return this.dateAllowsInvalid ? `(${this.expression})` : this.expression
	}

	readonly domain = "object"

	get defaultBrief(): string {
		return this.description
	}
}

export const Proto = {
	implementation,
	Node: ProtoNode,
	writeBadInvalidDateMessage: (actual: Constructor): string =>
		`dateAllowsInvalid may only be specified with constructor Date (was ${functionNameOf(actual)})`,
	writeInvalidSchemaMessage: (actual: unknown): string =>
		`instanceOf operand must be a function (was ${domainOf(actual)})`
}

import {
	domainOf,
	functionNameOf,
	getBuiltinNameOfConstructor,
	isValidDate,
	objectKindDescriptions,
	objectKindOrDomainOf,
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
		hasAssociatedError: true,
		collapsibleKey: "proto",
		keys: {
			proto: {
				serialize: ctor =>
					getBuiltinNameOfConstructor(ctor) ?? registeredReference(ctor)
			},
			dateAllowsInvalid: {}
		},
		applyConfig: (inner, config) =>
			(
				inner.dateAllowsInvalid === undefined &&
				inner.proto === Date &&
				config.dateAllowsInvalid
			) ?
				{ ...inner, dateAllowsInvalid: true }
			:	inner,
		defaults: {
			description: node => {
				const builtinName = getBuiltinNameOfConstructor(node.proto)
				return builtinName ?
						objectKindDescriptions[builtinName]
					:	`an instance of ${functionNameOf(node.proto)}`
			},
			actual: data =>
				data instanceof Date && !isValidDate(data) ?
					"an invalid Date"
				:	objectKindOrDomainOf(data)
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
	serializedConstructor: string =
		this.builtinName ?? registeredReference(this.proto)

	private readonly requiresInvalidDateCheck =
		this.proto === Date && !this.dateAllowsInvalid

	// Array.isArray is realm-safe; `instanceof Array` rejects arrays from other
	// windows/vm contexts (https://github.com/arktypeio/arktype/issues/1597).
	private readonly isArrayProto = this.proto === Array

	// a builtin is read from the global at call time, as compiled code reads it by name
	traverseAllows: TraverseAllows =
		this.requiresInvalidDateCheck ?
			data => data instanceof Date && isValidDate(data)
		: this.isArrayProto ? data => Array.isArray(data)
		: this.builtinName ?
			data => data instanceof (globalThis as never)[this.builtinName!]
		:	data => data instanceof this.proto

	compiledCondition =
		this.isArrayProto ? `Array.isArray(data)` : (
			`data instanceof ${this.serializedConstructor}${this.requiresInvalidDateCheck ? ` && data.toString() !== "Invalid Date"` : ""}`
		)
	compiledNegation = `!(${this.compiledCondition})`

	compile(js: NodeCompiler): void {
		const condition =
			this.requiresInvalidDateCheck ?
				`data instanceof Date && ${js.ref(isValidDate)}(data)`
			: this.builtinName ? this.compiledCondition
			: `data instanceof ${js.ref(this.proto)}`
		if (js.traversalKind === "Allows") js.return(condition)
		else {
			js.if(`!(${condition})`, () =>
				js.line(
					`ctx.errorFromNodeContext(${js.errorContext(this.errorContext!)}, data)`
				)
			)
		}
	}

	expression: string =
		this.dateAllowsInvalid ? "Date | InvalidDate" : functionNameOf(this.proto)

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
		`dateAllowsInvalid may only be specified with constructor Date (was ${functionNameOf(actual)})`,
	writeInvalidSchemaMessage: (actual: unknown): string =>
		`instanceOf operand must be a function (was ${domainOf(actual)})`
}

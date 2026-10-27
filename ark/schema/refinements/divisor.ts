import { printDecimal, throwParseError } from "@ark/util"
import {
	InternalPrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"

export declare namespace Divisor {
	export interface Inner {
		readonly rule: number
	}

	export interface ExpandedSchema extends BaseNodeInput {
		readonly rule: number
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext extends BaseErrorContext<"divisor">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "divisor"
			inner: Inner
			prerequisite: number
			errorCtx: ErrorContext
		}> {}

	export type Node = DivisorNode
}

const implementation: nodeImplementationOf<Divisor.Declaration> =
	implementNode<Divisor.Declaration>({
		kind: "divisor",
		bareKey: "rule",
		keys: {
			rule: {}
		},
		ownErr: true,
		defaults: {
			description: node =>
				node.rule === 1 ? "an integer"
				: node.rule === 2 ? "even"
				: `a multiple of ${node.rule}`
		},
		coversNoun: true
	})

export class DivisorNode extends InternalPrimitiveConstraint<Divisor.Declaration> {
	constructor(
		...args: ConstructorParameters<typeof InternalPrimitiveConstraint>
	) {
		super(...args)
		if (!Number.isInteger(this.rule))
			throwParseError(writeNonIntegerDivisorMessage(this.rule))
	}

	traverseAllows(data: number): boolean {
		return data % this.rule === 0
	}

	compileCondition(js: NodeCompiler, data: string): string {
		return `${data} % ${this.rule} === 0`
	}

	readonly implied: BaseRoot = $ark.kw.number.internal
	readonly expression: string = `% ${printDecimal(this.rule)}`
}

export const Divisor = {
	impl: implementation,
	Node: DivisorNode
}

export const writeIndivisibleMessage = (t: BaseRoot): string =>
	writeInvalidOperandMessage("divisor", $ark.kw.number as never, t)

export type writeIndivisibleMessage<actual> = writeInvalidOperandMessage<
	"divisor",
	actual
>

export const writeNonIntegerDivisorMessage = <divisor extends number>(
	divisor: divisor
): writeNonIntegerDivisorMessage<divisor> =>
	`divisor must be an integer (was ${divisor})`

export type writeNonIntegerDivisorMessage<divisor extends number> =
	`divisor must be an integer (was ${divisor})`

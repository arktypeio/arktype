import type { BaseRoot, IntersectionNode } from "@ark/schema"
import { Callable, throwParseError, type Fn } from "@ark/util"
import type { NaryFnParser, Return } from "./nary.ts"
import type { InternalScope, Scope } from "./scope.ts"
import type { Type } from "./type.ts"

export interface FnParser<$ = {}> extends NaryFnParser<$> {
	/**
	 * The {@link Scope} in which definitions passed to this function will be parsed.
	 */
	$: Scope<$>

	/**
	 * An alias of `fn` with no type-level validation or inference.
	 *
	 * Useful when wrapping `fn` or using it to parse a dynamic definition.
	 */
	raw: RawFnParser
}

export type RawFnParser = (
	...args: unknown[]
) => (...args: unknown[]) => unknown

type FnParserAttachments = Omit<FnParser, never>

export class InternalFnParser extends Callable<(...args: unknown[]) => Fn> {
	constructor($: InternalScope) {
		const attach: FnParserAttachments = {
			$: $ as never,
			raw: $.fn
		}

		super(
			(...signature) => {
				const returnOperatorIndex = signature.indexOf(":")
				const lastParamIndex =
					returnOperatorIndex === -1 ?
						signature.length - 1
					:	returnOperatorIndex - 1

				const paramDefs = signature.slice(0, lastParamIndex + 1)

				const paramTuple = $.parse(paramDefs).assertHasKind("intersection")

				let returnType: BaseRoot = $.intrinsic.unknown

				if (returnOperatorIndex !== -1) {
					if (returnOperatorIndex !== signature.length - 2)
						return throwParseError(badFnReturnTypeMessage)
					returnType = $.parse(signature[returnOperatorIndex + 1])
				}

				return (impl: Fn) => new InternalTypedFn(impl, paramTuple, returnType)
			},
			{ attach }
		)
	}
}

export declare namespace TypedFn {
	export type meta = {
		introspectableReturn?: true
	}
}

export interface TypedFn<
	signature extends Fn = Fn,
	$ = {},
	meta extends TypedFn.meta = {}
> extends Callable<signature> {
	expression: string
	params: signature extends Fn<infer params> ?
		{
			[i in keyof params]: Type<params[i], $>
		}
	:	never
	returns: Type<
		meta extends Return.introspectable ? ReturnType<signature> : unknown,
		$
	>
}

export class InternalTypedFn extends Callable<(...args: unknown[]) => unknown> {
	raw: Fn
	params: IntersectionNode
	returns: BaseRoot
	expression: string

	constructor(raw: Fn, params: IntersectionNode, returns: BaseRoot) {
		const typedName = `typed ${raw.name}`
		const typed = {
			// assign to a key with the expected name to force it to be created that way
			[typedName]: (...args: unknown[]) => {
				const validatedArgs = params.assert(args) as unknown[]
				const returned = raw(...validatedArgs)
				return returns.assert(returned)
			}
		}[typedName]

		super(typed)
		this.raw = raw
		this.params = params
		this.returns = returns

		this.expression = `(${params.expression}) => ${returns?.expression ?? "unknown"}`
	}
}

export const badFnReturnTypeMessage = `":" must be followed by exactly one return type e.g:
fn("string", ":", "number")(s => s.length)`

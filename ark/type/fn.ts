import type { BaseRoot } from "@ark/schema"
import { alphabet, Callable, throwParseError, type Fn } from "@ark/util"
import type { NaryFnParser } from "./nary.ts"
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
				const paramTypes: BaseRoot[] = []

				let i = 0
				for (; i < signature.length && signature[i] !== ":"; i++)
					paramTypes[i] = $.parse(signature[i])

				let returnType: BaseRoot | null = null

				if (signature[i] === ":") {
					if (i !== signature.length - 2)
						return throwParseError(badFnReturnTypeMessage)
					returnType = $.parse(signature[i + 1])
				}

				return (impl: Fn) => new InternalTypedFn(impl, paramTypes, returnType)
			},
			{ attach }
		)
	}
}

export interface TypedFn<signature extends Fn = Fn, $ = {}>
	extends Callable<signature> {
	expression: string
	params: {
		[i in keyof Parameters<signature>]: Type<Parameters<signature>[i], $>
	}
	returns: BaseRoot | null
}

export class InternalTypedFn extends Callable<(...args: unknown[]) => unknown> {
	raw: Fn
	params: readonly BaseRoot[]
	returns: BaseRoot | null
	expression: string

	constructor(raw: Fn, params: readonly BaseRoot[], returns: BaseRoot | null) {
		const typedName = `typed ${raw.name}`
		const typed = {
			// assign to a key with the expected name to force it to be created that way
			[typedName]: (...args: unknown[]) => {
				const validatedArgs = params.map((p, i) => p.assert(args[i]))
				const returned = raw(...validatedArgs)
				return returns ? returns.assert(returned) : returned
			}
		}[typedName]

		super(typed)
		this.raw = raw
		this.params = params
		this.returns = returns

		const paramsExpression = params
			.map((p, i) => `${alphabet[i]}: ${p.expression}`)
			.join(", ")
		this.expression = `(${paramsExpression}) => ${returns?.expression ?? "unknown"}`
	}
}

export const badFnReturnTypeMessage = `":" must be followed by exactly one return type e.g:
fn("string", ":", "number")(s => s.length)`

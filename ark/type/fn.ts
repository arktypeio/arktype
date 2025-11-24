import type { BaseRoot, IntersectionNode, TypeMeta } from "@ark/schema"
import {
	Callable,
	throwParseError,
	type applyElementLabels,
	type conform,
	type Fn,
	type get
} from "@ark/util"
import type { distill } from "./attributes.ts"
import type { ArkConfig } from "./config.ts"
import type { type } from "./keywords/keywords.ts"
import type { validateInnerDefinition } from "./parser/definition.ts"
import type {
	inferTupleLiteral,
	validateTupleLiteral
} from "./parser/tupleLiteral.ts"
import type { InternalScope, Scope } from "./scope.ts"
import type { Type } from "./type.ts"

export type BaseFnParser<$ = {}> = <
	const args extends readonly unknown[],
	paramsT extends readonly unknown[] = inferTupleLiteral<
		args extends readonly [...infer params, ":", unknown] ? params : args,
		$,
		{}
	>,
	returnT = args extends readonly [...unknown[], ":", infer returnDef] ?
		type.infer<returnDef, $>
	:	unknown
>(
	...args: {
		[i in keyof args]: conform<args[i], get<validateFnArgs<args, $>, i>>
	}
) => <
	internalSignature extends (
		...args: distill.Out<paramsT>
	) => distill.In<returnT>,
	externalSignature extends Fn = (
		...args: applyElementLabels<
			distill.In<paramsT>,
			Parameters<internalSignature>
		>
	) => args extends readonly [...unknown[], ":", unknown] ? distill.Out<returnT>
	:	ReturnType<internalSignature>
>(
	implementation: internalSignature
) => TypedFn<
	externalSignature,
	$,
	args extends readonly [...unknown[], ":", unknown] ? Return.introspectable
	:	{}
>

export interface FnParser<$ = {}> extends BaseFnParser<$> {
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

	[key: string]: (meta: TypeMeta | string) => FnParser<$>
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
	params: signature extends Fn<infer params> ? Type<params, $> : never
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

		let argsExpression = params.expression
		if (
			argsExpression[0] === "[" &&
			argsExpression[argsExpression.length - 1] === "]"
		)
			argsExpression = argsExpression.slice(1, -1)
		else if (argsExpression.endsWith("[]"))
			argsExpression = `...${argsExpression}`

		this.expression = `(${argsExpression}) => ${returns?.expression ?? "unknown"}`
	}
}

export declare namespace Return {
	export interface introspectable {
		introspectableReturn: true
	}
}

type validateFnArgs<args, $> =
	args extends readonly unknown[] ?
		args extends readonly [...infer paramDefs, ":", infer returnDef] ?
			readonly [
				...validateFnParamDefs<paramDefs, $>,
				":",
				type.validate<returnDef, $>
			]
		:	validateFnParamDefs<args, $>
	:	never

type validateFnParamDefs<paramDefs extends readonly unknown[], $> =
	paramDefs extends validateTupleLiteral<paramDefs, $, {}> ? paramDefs
	: paramDefs extends {
		[i in keyof paramDefs]: paramDefs[i] extends "..." ? paramDefs[i]
		:	validateInnerDefinition<paramDefs[i], $, {}>
	} ?
		validateTupleLiteral<paramDefs, $, {}>
	:	{ [i in keyof paramDefs]: validateInnerDefinition<paramDefs[i], $, {}> }

export const badFnReturnTypeMessage = `":" must be followed by exactly one return type e.g:
fn("string", ":", "number")(s => s.length)`

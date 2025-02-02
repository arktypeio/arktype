import {
	intrinsic,
	type ArkError,
	type BaseRoot,
	type Morph,
	type Union
} from "@ark/schema"
import {
	Callable,
	domainOf,
	throwParseError,
	type conform,
	type ErrorMessage,
	type ErrorType,
	type isDisjoint,
	type Key,
	type mutable,
	type numericStringKeyOf,
	type propValueOf,
	type unionToTuple
} from "@ark/util"
import type { distill, inferIntersection } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { BaseCompletions } from "./parser/string.ts"
import type { InternalScope } from "./scope.ts"

type MatchParserContext<input = unknown> = {
	cases: Morph[]
	$: unknown
	input: input
	key: Key | undefined
}

declare namespace MatchParserContext {
	export type from<ctx extends MatchParserContext> = ctx

	export interface withoutKey extends MatchParserContext {
		key: undefined
	}

	export type atKey<ctx extends MatchParserContext, key extends Key> = from<{
		cases: ctx["cases"]
		$: ctx["$"]
		input: ctx["input"]
		key: key
	}>
}

export interface MatchParser<$>
	extends CaseMatchParser<{
		cases: []
		$: $
		input: unknown
		key: undefined
	}> {
	in<const def>(def: type.validate<def, $>): ChainableMatchParser<{
		cases: []
		$: $
		input: type.infer<def, $>
		key: undefined
	}>
	in<const typedInput = never>(
		...args: [typedInput] extends [never] ?
			[
				ErrorMessage<"from requires a definition or type argument (from('string') or from<string>())">
			]
		:	[]
	): ChainableMatchParser<{
		cases: []
		$: $
		input: typedInput
		key: undefined
	}>
	// include this signature a second time so that e.g. `match.from({ foo: "strin" })` shows the right error
	in<const def>(def: type.validate<def, $>): ChainableMatchParser<{
		cases: []
		$: $
		input: type.infer<def, $>
		key: undefined
	}>

	case: CaseParser<{
		cases: []
		$: $
		input: unknown
		key: undefined
	}>

	at: AtParser<{
		cases: []
		$: $
		input: unknown
		key: undefined
	}>
}

type addCasesToContext<
	ctx extends MatchParserContext,
	cases extends unknown[]
> =
	cases extends Morph[] ?
		MatchParserContext.from<{
			$: ctx["$"]
			input: ctx["input"]
			cases: [...ctx["cases"], ...cases]
			key: undefined
		}>
	:	never

type addDefaultToContext<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> = MatchParserContext.from<{
	$: ctx["$"]
	input: defaultCase extends "never" ? Morph.In<ctx["cases"][number]>
	:	ctx["input"]
	cases: defaultCase extends Morph ? [...ctx["cases"], defaultCase]
	: defaultCase extends "never" | "assert" ? ctx["cases"]
	: [...ctx["cases"], (In: ctx["input"]) => ArkError]
	key: undefined
}>

type addCasesToParser<cases, ctx extends MatchParserContext> =
	cases extends { default: infer defaultDef extends DefaultCase<ctx> } ?
		finalizeMatchParser<
			addCasesToContext<
				ctx,
				unionToTuple<cases[Exclude<keyof cases, "default">]>
			>,
			defaultDef
		>
	:	ChainableMatchParser<
			addCasesToContext<ctx, unionToTuple<propValueOf<cases>>>
		>

type inferCaseArg<def, ctx extends MatchParserContext> = _finalizeCaseArg<
	type.infer.Out<
		ctx["key"] extends Key ? { [k in ctx["key"]]: def } : def,
		ctx["$"]
	>,
	ctx
>

type _finalizeCaseArg<caseArg, ctx extends MatchParserContext> =
	caseArg extends ctx["input"] ? caseArg
	: Extract<ctx["input"], caseArg> extends never ? ctx["input"] & caseArg
	: Extract<ctx["input"], caseArg>

type CaseParser<ctx extends MatchParserContext> = <const def, ret>(
	def: type.validate<def, ctx["$"]>,
	resolve: (In: inferCaseArg<def, ctx>) => ret
) => ChainableMatchParser<
	addCasesToContext<ctx, [(In: inferCaseArg<def, ctx>) => ret]>
>

type validateKey<key extends Key, ctx extends MatchParserContext> =
	keyof ctx["input"] extends never ? key : conform<key, keyof ctx["input"]>

interface AtParser<ctx extends MatchParserContext> {
	<key extends Key>(
		key: validateKey<key, ctx>
	): ChainableMatchParser<MatchParserContext.atKey<ctx, key>>

	<
		key extends Key,
		const cases,
		ctxAtKey extends MatchParserContext = MatchParserContext.atKey<ctx, key>
	>(
		key: validateKey<key, ctx>,
		cases: cases extends validateCases<cases, ctxAtKey> ? cases
		:	errorCases<cases, ctxAtKey>
	): {} extends cases ? ChainableMatchParser<ctxAtKey>
	:	addCasesToParser<cases, ctx>
}

interface ChainableMatchParser<ctx extends MatchParserContext> {
	case: CaseParser<ctx>
	match: CaseMatchParser<ctx>
	default: DefaultMethod<ctx>
	at: AtParser<ctx>
}

export type DefaultCaseKeyword = "never" | "assert" | "reject"

type DefaultCase<ctx extends MatchParserContext = MatchParserContext<any>> =
	| DefaultCaseKeyword
	| Morph<ctx["input"]>

type DefaultMethod<ctx extends MatchParserContext> = <
	const def extends DefaultCase<ctx>
>(
	def: def
) => finalizeMatchParser<ctx, def>

type validateCases<cases, ctx extends MatchParserContext> = {
	[def in
		| keyof cases
		| BaseCompletions<ctx["$"], {}, "default">]?: def extends "default" ?
		DefaultCase<ctx>
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferCaseArg<def, ctx>) => unknown
	:	type.validate<def, ctx["$"]>
}

type errorCases<cases, ctx extends MatchParserContext> = {
	[def in keyof cases]?: def extends "default" ? DefaultCase<ctx>
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferCaseArg<def, ctx>) => unknown
	:	ErrorType<type.validate<def, ctx["$"]>>
} & {
	[k in Exclude<BaseCompletions<ctx["$"], {}>, keyof cases>]?: (
		In: distill.Out<inferIntersection<ctx["input"], inferCaseArg<k, ctx>>>
	) => unknown
} & {
	default?: DefaultCase<ctx>
}

export type CaseMatchParser<ctx extends MatchParserContext> = <const cases>(
	def: cases extends validateCases<cases, ctx> ? cases : errorCases<cases, ctx>
) => addCasesToParser<cases, ctx>

type finalizeMatchParser<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> =
	addDefaultToContext<ctx, defaultCase> extends (
		infer ctx extends MatchParserContext
	) ?
		Match<ctx["input"], ctx["cases"]>
	:	never

export interface Match<input = any, cases extends Morph[] = Morph[]> {
	<const data extends input>(
		data: data
	): {
		[i in numericStringKeyOf<cases>]: isDisjoint<
			data,
			Morph.In<cases[i]>
		> extends true ?
			never
		:	Morph.Out<cases[i]>
	}[numericStringKeyOf<cases>]

	internal: BaseRoot
}

export class InternalMatchParser extends Callable<InternalCaseParserFn> {
	$: InternalScope

	constructor($: InternalScope) {
		super((...args) => new InternalChainedMatchParser($)(...args), {
			bind: $
		})
		this.$ = $
	}

	in(): InternalChainedMatchParser {
		return new InternalChainedMatchParser(this.$)
	}

	at(key: Key): InternalChainedMatchParser {
		return new InternalChainedMatchParser(this.$).at(key)
	}

	case(when: unknown, then: Morph): InternalChainedMatchParser {
		return new InternalChainedMatchParser(this.$).case(when, then)
	}
}

type InternalCases = Record<string, Morph | DefaultCase>

type InternalCaseParserFn = (
	cases: InternalCases
) => InternalChainedMatchParser | Match

export class InternalChainedMatchParser extends Callable<InternalCaseParserFn> {
	$: InternalScope
	protected key: Key | undefined
	protected branches: BaseRoot[] = []

	constructor($: InternalScope) {
		super(cases => {
			const entries = Object.entries(cases)
			for (let i = 0; i < entries.length; i++) {
				const [k, v] = entries[i]
				if (k === "default") {
					if (i !== entries.length - 1) {
						throwParseError(
							`default may only be specified as the last key of a switch definition`
						)
					}
					return this.default(v)
				}
				if (typeof v !== "function") {
					return throwParseError(
						`Value for case "${k}" must be a function (was ${domainOf(v)})`
					)
				}

				this.case(k, v)
			}

			return this
		})
		this.$ = $
	}

	at(key: Key): this {
		this.key = key
		return this
	}

	case(def: unknown, resolver: Morph): this {
		const wrappableDef = this.key ? { [this.key]: def } : def
		const branch = this.$.parse(wrappableDef).pipe(resolver as never)
		this.branches.push(branch)
		return this
	}

	match(cases: InternalCases): InternalChainedMatchParser | Match {
		return this(cases)
	}

	default(defaultCase: DefaultCase): Match {
		if (typeof defaultCase === "function")
			this.case(intrinsic.unknown, defaultCase)

		const schema: mutable<Union.Schema> = {
			branches: this.branches,
			ordered: true
		}

		if (defaultCase === "never" || defaultCase === "assert")
			schema.meta = { onFail: errors => errors.throw() }

		const matcher = this.$.node("union", schema)

		return matcher as never
	}
}

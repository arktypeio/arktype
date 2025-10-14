import {
	intrinsic,
	type ArkErrors,
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
	type show,
	type unionToTuple
} from "@ark/util"
import type { distill, Out } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { BaseCompletions } from "./parser/string.ts"
import type { InternalScope } from "./scope.ts"
import type { Inferred } from "./variants/base.ts"

type MatchParserContext<input = unknown> = {
	cases: Morph[]
	$: unknown
	input: input
	checked: boolean
	key: PropertyKey | null
}

declare namespace ctx {
	export type from<ctx extends MatchParserContext> = ctx

	export type init<$, input = unknown, checked extends boolean = false> = from<{
		cases: []
		$: $
		input: input
		checked: checked
		key: null
	}>

	export type atKey<ctx extends MatchParserContext, key extends string> = from<{
		cases: ctx["cases"]
		$: ctx["$"]
		input: ctx["input"]
		checked: ctx["checked"]
		key: key
	}>
}

export interface MatchParser<$> extends CaseMatchParser<ctx.init<$>> {
	in<const def>(
		def: type.validate<def, $>
	): ChainableMatchParser<ctx.init<$, type.infer<def, $>, true>>
	in<const typedInput = never>(
		...args: [typedInput] extends [never] ?
			[
				ErrorMessage<"in requires a definition or type argument (in('string') or in<string>())">
			]
		:	[]
	): ChainableMatchParser<ctx.init<$, typedInput>>
	// include this signature a second time so that e.g. `match.in({ foo: "strin" })` shows the right error
	in<const def>(
		def: type.validate<def, $>
	): ChainableMatchParser<ctx.init<$, type.infer<def, $>, true>>

	case: CaseParser<ctx.init<$>>

	at: AtParser<ctx.init<$>>
}

type addCasesToContext<
	ctx extends MatchParserContext,
	cases extends unknown[]
> =
	cases extends Morph[] ?
		ctx.from<{
			$: ctx["$"]
			input: ctx["input"]
			cases: [...ctx["cases"], ...cases]
			checked: ctx["checked"]
			key: ctx["key"]
		}>
	:	never

type addDefaultToContext<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> = ctx.from<{
	$: ctx["$"]
	input: defaultCase extends "never" ? Morph.In<ctx["cases"][number]>
	:	ctx["input"]
	cases: defaultCase extends "never" | "assert" ? ctx["cases"]
	: defaultCase extends Morph ?
		ctx["checked"] extends true ?
			[(In: unknown) => ArkErrors, ...ctx["cases"], defaultCase]
		:	[...ctx["cases"], defaultCase]
	:	// we already are guaranteed ArkErrors as a possible output here
		// so don't bother adding it as an input case
		[...ctx["cases"], (In: ctx["input"]) => ArkErrors]
	checked: ctx["checked"]
	key: ctx["key"]
}>

type CaseKeyKind = "def" | "string"

type casesToMorphTuple<
	cases,
	ctx extends MatchParserContext,
	kind extends CaseKeyKind
> = unionToTuple<
	propValueOf<{
		[def in Exclude<keyof cases, "default">]: cases[def] extends (
			Morph<never, infer o>
		) ?
			kind extends "def" ?
				(
					In: inferCaseArg<def extends number ? `${number}` : def, ctx, "in">
				) => o
			:	(In: maybeLiftToKey<def, ctx>) => o
		:	never
	}>
>

type addCasesToParser<
	cases,
	ctx extends MatchParserContext,
	kind extends CaseKeyKind
> =
	cases extends { default: infer defaultDef extends DefaultCase<ctx> } ?
		finalizeMatchParser<
			addCasesToContext<ctx, casesToMorphTuple<cases, ctx, kind>>,
			defaultDef
		>
	:	ChainableMatchParser<
			addCasesToContext<ctx, casesToMorphTuple<cases, ctx, kind>>
		>

type inferCaseArg<
	def,
	ctx extends MatchParserContext,
	endpoint extends "in" | "out"
> = _finalizeCaseArg<
	maybeLiftToKey<type.infer<def, ctx["$"]>, ctx>,
	ctx,
	endpoint
>

type maybeLiftToKey<t, ctx extends MatchParserContext> =
	ctx["key"] extends PropertyKey ? { [k in ctx["key"]]: t } : t

type _finalizeCaseArg<
	t,
	ctx extends MatchParserContext,
	endpoint extends "in" | "out",
	ctxInput = ctx["input"]
> =
	ctxInput extends unknown ?
		t extends unknown ?
			distill<t, endpoint> extends infer result ?
				ctxInput extends result ?
					ctxInput
				:	show<ctxInput & result>
			:	never
		:	never
	:	never

type CaseParser<ctx extends MatchParserContext> = <const def, ret>(
	def: type.validate<def, ctx["$"]>,
	resolve: (In: inferCaseArg<def, ctx, "out">) => ret
) => ChainableMatchParser<
	addCasesToContext<ctx, [(In: inferCaseArg<def, ctx, "in">) => ret]>
>

type validateKey<key extends Key, ctx extends MatchParserContext> =
	ctx["key"] extends Key ? ErrorMessage<doubleAtMessage>
	: ctx["cases"]["length"] extends 0 ?
		keyof ctx["input"] extends never ?
			key
		:	conform<key, keyof ctx["input"]>
	:	ErrorMessage<chainedAtMessage>

interface StringsParser<ctx extends MatchParserContext> {
	<const cases>(
		def: cases extends validateStringCases<cases, ctx> ? cases
		:	validateStringCases<cases, ctx>
	): addCasesToParser<cases, ctx, "string">
}

type validateStringCases<cases, ctx extends MatchParserContext> =
	unknown extends ctx["input"] ?
		{
			[k in keyof cases]?: k extends "default" ? DefaultCase<ctx>
			:	(In: _finalizeCaseArg<maybeLiftToKey<k, ctx>, ctx, "out">) => unknown
			// always autocomplete the "default" key
		} & { default?: DefaultCase<ctx> }
	:	{
			[k in keyof cases]?: k extends "default" ? DefaultCase<ctx>
			: k extends stringValue<ctx> ?
				(In: _finalizeCaseArg<maybeLiftToKey<k, ctx>, ctx, "out">) => unknown
			:	ErrorType<`${k & string} must be a possible string value`>
		} & { [k in stringValue<ctx>]?: unknown } & {
			default?: DefaultCase<ctx>
		}

type stringValue<ctx extends MatchParserContext> =
	ctx["input"] extends string ? ctx["input"]
	: ctx["key"] extends keyof ctx["input"] ?
		ctx["input"][ctx["key"]] extends infer s extends string ?
			s
		:	never
	:	never

interface AtParser<ctx extends MatchParserContext> {
	<const key extends string>(
		key: validateKey<key, ctx>
	): ChainableMatchParser<ctx.atKey<ctx, key>>

	<
		const key extends string,
		const cases,
		ctxAtKey extends MatchParserContext = ctx.atKey<ctx, key>
	>(
		key: validateKey<key, ctx>,
		cases: cases extends validateCases<cases, ctxAtKey> ? cases
		:	errorCases<cases, ctxAtKey>
	): addCasesToParser<cases, ctxAtKey, "def">
}

interface ChainableMatchParser<ctx extends MatchParserContext> {
	case: CaseParser<ctx>
	match: CaseMatchParser<ctx>
	default: DefaultMethod<ctx>
	at: AtParser<ctx>
	/** @experimental */
	strings: StringsParser<ctx>
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
	: def extends number ? (In: inferCaseArg<`${def}`, ctx, "out">) => unknown
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferCaseArg<def, ctx, "out">) => unknown
	:	type.validate<def, ctx["$"]>
}

type errorCases<cases, ctx extends MatchParserContext> = {
	[def in keyof cases]?: def extends "default" ? DefaultCase<ctx>
	: def extends number ? (In: inferCaseArg<`${def}`, ctx, "out">) => unknown
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferCaseArg<def, ctx, "out">) => unknown
	:	ErrorType<type.validate<def, ctx["$"]>>
} & {
	[k in BaseCompletions<ctx["$"], {}>]?: (
		In: inferCaseArg<k, ctx, "out">
	) => unknown
} & {
	default?: DefaultCase<ctx>
}

export type CaseMatchParser<ctx extends MatchParserContext> = <const cases>(
	def: cases extends validateCases<cases, ctx> ? cases : errorCases<cases, ctx>
) => addCasesToParser<cases, ctx, "def">

type finalizeMatchParser<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> =
	addDefaultToContext<ctx, defaultCase> extends (
		infer ctx extends MatchParserContext
	) ?
		Match<ctx["input"], ctx["cases"]>
	:	never

export interface Match<In = any, cases extends Morph[] = Morph[]>
	extends Inferred<
		(In: Morph.In<cases[number]>) => Out<ReturnType<cases[number]>>
	> {
	<const data extends In>(
		data: data
	): {
		[i in numericStringKeyOf<cases>]: isDisjoint<
			data,
			Morph.In<cases[i]>
		> extends true ?
			never
		:	Morph.Out<cases[i]>
	}[numericStringKeyOf<cases>]
}

export class InternalMatchParser extends Callable<InternalCaseParserFn> {
	$: InternalScope

	constructor($: InternalScope) {
		super((...args) => new InternalChainedMatchParser($)(...args), {
			bind: $
		})
		this.$ = $
	}

	in(def?: unknown): InternalChainedMatchParser {
		return new InternalChainedMatchParser(
			this.$,
			def === undefined ? undefined : this.$.parse(def)
		)
	}

	at(key: Key, cases?: InternalCases): InternalChainedMatchParser | Match {
		return new InternalChainedMatchParser(this.$).at(key, cases)
	}

	case(when: unknown, then: Morph): InternalChainedMatchParser {
		return new InternalChainedMatchParser(this.$).case(when, then)
	}
}

type InternalCases = Record<string, Morph | DefaultCase>

type InternalCaseParserFn = (
	cases: InternalCases
) => InternalChainedMatchParser | Match

type CaseEntry = [BaseRoot, Morph] | ["default", DefaultCase]

export class InternalChainedMatchParser extends Callable<InternalCaseParserFn> {
	$: InternalScope;
	in: BaseRoot | undefined
	protected key: Key | undefined
	protected branches: BaseRoot[] = []

	constructor($: InternalScope, In?: BaseRoot) {
		super(cases =>
			this.caseEntries(
				Object.entries(cases).map(([k, v]) =>
					k === "default" ? [k, v as never] : [this.$.parse(k), v as Morph]
				)
			)
		)
		this.$ = $
		this.in = In
	}

	at(key: Key, cases?: InternalCases): InternalChainedMatchParser | Match {
		if (this.key) throwParseError(doubleAtMessage)
		if (this.branches.length) throwParseError(chainedAtMessage)
		this.key = key
		return cases ? this.match(cases) : this
	}

	case(def: unknown, resolver: Morph): InternalChainedMatchParser {
		return this.caseEntry(this.$.parse(def), resolver)
	}

	protected caseEntry(
		node: BaseRoot,
		resolver: Morph
	): InternalChainedMatchParser {
		const wrappableNode = this.key ? this.$.parse({ [this.key]: node }) : node
		const branch = wrappableNode.pipe(resolver as never)
		this.branches.push(branch)
		return this
	}

	match(cases: InternalCases): InternalChainedMatchParser | Match {
		return this(cases)
	}

	strings(cases: InternalCases): InternalChainedMatchParser | Match {
		return this.caseEntries(
			Object.entries(cases).map(([k, v]) =>
				k === "default" ?
					[k, v as never]
				:	[this.$.node("unit", { unit: k }), v as Morph]
			)
		)
	}

	protected caseEntries(
		entries: CaseEntry[]
	): InternalChainedMatchParser | Match {
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

			this.caseEntry(k, v)
		}

		return this
	}

	default(defaultCase: DefaultCase): Match {
		if (typeof defaultCase === "function")
			this.case(intrinsic.unknown, defaultCase)

		const schema: mutable<Union.Schema> = {
			branches: this.branches,
			ordered: true
		}

		if (defaultCase === "never" || defaultCase === "assert")
			schema.meta = { onFail: throwOnDefault }

		const cases = this.$.node("union", schema)

		if (!this.in) return this.$.finalize(cases) as never

		let inputValidatedCases = this.in.pipe(cases)

		if (defaultCase === "never" || defaultCase === "assert") {
			inputValidatedCases = inputValidatedCases.configureReferences(
				{
					onFail: throwOnDefault
				},
				"self"
			)
		}

		return this.$.finalize(inputValidatedCases) as never
	}
}

export const throwOnDefault: ArkErrors.Handler = errors => errors.throw()

export const chainedAtMessage = `A key matcher must be specified before the first case i.e. match.at('foo') or match.in<object>().at('bar')`
export type chainedAtMessage = typeof chainedAtMessage

export const doubleAtMessage = `At most one key matcher may be specified per expression`
export type doubleAtMessage = typeof doubleAtMessage

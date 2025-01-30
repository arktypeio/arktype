import { intrinsic, type ArkError, type BaseRoot } from "@ark/schema"
import {
	Callable,
	domainOf,
	throwParseError,
	type Fn,
	type isDisjoint,
	type numericStringKeyOf,
	type propValueOf,
	type satisfy,
	type unionToTuple
} from "@ark/util"
import type { distill, inferIntersection } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { InternalScope } from "./scope.ts"

type CaseHandler = (In: never) => unknown

type MatchParserContext<input = unknown> = {
	cases: CaseHandler[]
	$: unknown
	input: input
}

export type MatchParser<$> = CaseMatchParser<{
	cases: []
	$: $
	input: unknown
}> & {
	from<typedInput>(): ChainableMatchParser<{
		cases: []
		$: $
		input: typedInput
	}>
}

type addCases<
	ctx extends MatchParserContext,
	cases extends readonly unknown[]
> =
	cases extends CaseHandler[] ?
		satisfy<
			MatchParserContext,
			{
				$: ctx["$"]
				input: ctx["input"]
				cases: [...ctx["cases"], ...cases]
			}
		>
	:	never

// infer the types handled by a match branch, which is identical to `type.infer` while properly
// excluding cases that are already handled by other branches
type inferMatchBranch<def, ctx extends MatchParserContext> = distill.Out<
	inferIntersection<ctx["input"], type.infer<def, ctx["$"]>>
>

type ChainableMatchParser<ctx extends MatchParserContext> = {
	// chainable methods
	when: <def, ret>(
		when: type.validate<def, ctx["$"]>,
		then: (In: inferMatchBranch<def, ctx>) => ret
	) => ChainableMatchParser<
		addCases<ctx, [(In: inferMatchBranch<def, ctx>) => ret]>
	>
	switch: CaseMatchParser<ctx>

	default: DefaultMethod<ctx>
}

export type DefaultCaseKeyword = "never" | "assert" | "reject"

type DefaultCase<ctx extends MatchParserContext = MatchParserContext<never>> =
	| DefaultCaseKeyword
	| ((data: ctx["input"]) => unknown)

type DefaultMethod<ctx extends MatchParserContext> = <
	const def extends DefaultCase<ctx>
>(
	def: def
) => finalizeMatchParser<ctx, def>

type validateCases<cases, ctx extends MatchParserContext> = {
	[def in keyof cases | keyof ctx["$"] | "default"]?: def extends "default" ?
		DefaultCase<ctx>
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferMatchBranch<def, ctx>) => unknown
	:	type.validate<def, ctx["$"]>
}

type errorCases<cases, ctx extends MatchParserContext> = {
	[def in keyof cases]?: def extends "default" ? DefaultCase<ctx>
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferMatchBranch<def, ctx>) => unknown
	:	type.validate<def, ctx["$"]>
} & {
	[k in Exclude<keyof ctx["$"], keyof cases>]?: (
		In: distill.Out<inferIntersection<ctx["input"], ctx["$"][k]>>
	) => unknown
} & {
	default?: DefaultCase<ctx>
}

export type CaseMatchParser<ctx extends MatchParserContext> = <cases>(
	def: cases extends validateCases<cases, ctx> ? cases : errorCases<cases, ctx>
) => cases extends { default: infer defaultDef extends DefaultCase<ctx> } ?
	finalizeMatchParser<
		addCases<ctx, unionToTuple<cases[Exclude<keyof cases, "default">]>>,
		defaultDef
	>
:	ChainableMatchParser<addCases<ctx, unionToTuple<propValueOf<cases>>>>

type defaultCaseToThen<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> =
	defaultCase extends Fn ? defaultCase
	: defaultCase extends "never" ? (In: never) => never
	: defaultCase extends "assert" ? (In: ctx["input"]) => never
	: (In: ctx["input"]) => ArkError

type finalizeMatchParser<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> =
	// this conditional ensures this is evaluated when displayed externally
	[...ctx["cases"], defaultCaseToThen<ctx, defaultCase>] extends (
		infer cases extends CaseHandler[]
	) ?
		Match<ctx["input"], cases>
	:	never

export type Match<
	input = never,
	cases extends CaseHandler[] = CaseHandler[]
> = <const data extends input>(
	data: data
) => {
	[i in numericStringKeyOf<cases>]: isDisjoint<
		data,
		Parameters<cases[i]>[0]
	> extends true ?
		never
	:	ReturnType<cases[i]>
}[numericStringKeyOf<cases>]

export class InternalMatchParser extends Callable<
	(...args: unknown[]) => unknown
> {
	$: InternalScope

	constructor($: InternalScope) {
		super((..._args) => {}, {
			bind: $
		})
		this.$ = $
	}
}

export class InternalChainedMatchParser {
	$: InternalScope

	constructor($: InternalScope) {
		this.$ = $
	}

	protected branches: BaseRoot[] = []

	when(when: unknown, then: CaseHandler): this {
		const branch = this.$.parse(when).pipe(then as never)
		this.branches.push(branch)
		return this
	}

	switch(
		cases: Record<string, CaseHandler | DefaultCase>
	): InternalChainedMatchParser | {} {
		const entries = Object.entries(cases)
		entries.forEach(([def, handler], i) => {
			if (def === "default") {
				if (i !== entries.length - 1) {
					throwParseError(
						`default may only be specified as the last key of a switch definition`
					)
				}
				return this.default(handler)
			}
			if (typeof handler !== "function") {
				return throwParseError(
					`Value for case "${def}" must be a function (was ${domainOf(handler)})`
				)
			}

			this.when(def, handler)
		})

		return this
	}

	default(defaultCase: DefaultCase): Match {
		if (typeof defaultCase === "function")
			this.when(intrinsic.unknown, defaultCase)

		const matcher = this.$.node("union", {
			branches: this.branches,
			ordered: true
		})

		if (defaultCase === "reject") return matcher as never

		return matcher.assert as never
	}
}

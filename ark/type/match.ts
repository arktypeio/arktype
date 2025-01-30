import {
	intrinsic,
	type ArkError,
	type BaseRoot,
	type Morph
} from "@ark/schema"
import {
	Callable,
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

type Case = (In: never) => unknown

type MatchParserContext = {
	cases: Case[]
	$: unknown
	input: unknown
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
	cases extends Case[] ?
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

type DefaultCase<ctx extends MatchParserContext> =
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
		infer cases extends Case[]
	) ?
		Match<ctx["input"], cases>
	:	never

export type Match<input, cases extends Case[]> = <const data extends input>(
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

	protected handledCases: { when: BaseRoot; then: Morph }[] = []

	when(when: unknown, then: Morph): this {
		this.handledCases.push({
			when: this.$.parse(when),
			then
		})

		return this
	}

	switch(
		cases: Record<string, Case | DefaultCase<MatchParserContext>>
	): InternalChainedMatchParser | {} {
		const entries = Object.entries(cases)
		for (let i = 0; i < entries.length; i++) {
			if (entries[i][0] === "default") {
				if (i !== entries.length - 1) {
					throwParseError(
						`default may only be specified as the last key of a switch definition`
					)
				}
				return this.finalize(entries[i][1])
			}
			this.when(...(entries[i] as [never, never]))
		}
		return this
	}

	protected finalize(defaultCase: DefaultCase<any>): {} {
		const branches = this.handledCases.flatMap(
			({ when, then }): Morph.Schema[] => {
				if (when.kind === "union") {
					return when.branches.map(branch => ({
						in: branch,
						morphs: [then]
					}))
				}
				if (when.hasKind("morph"))
					return [{ in: when, morphs: [...when.morphs, then] }]

				return [{ in: when, morphs: [then] }]
			}
		)
		if (this.defaultCase)
			branches.push({ in: intrinsic.unknown, morphs: [this.defaultCase] })

		const matchers = this.$.node("union", {
			branches,
			ordered: true
		})
		return matchers.assert
	}

	default(x: unknown): unknown {
		if (typeof x === "function") this.defaultCase = x as never
		else this.defaultCase = () => x

		return this.finalize()
	}
}

import {
	intrinsic,
	type ArkError,
	type BaseRoot,
	type Morph
} from "@ark/schema"
import {
	Callable,
	domainOf,
	throwParseError,
	type isDisjoint,
	type numericStringKeyOf,
	type propValueOf,
	type satisfy,
	type unionToTuple
} from "@ark/util"
import type { distill, inferIntersection } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { InternalScope } from "./scope.ts"

type MatchParserContext<input = unknown> = {
	cases: Morph[]
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

type addCasesToContext<
	ctx extends MatchParserContext,
	cases extends readonly unknown[]
> =
	cases extends Morph[] ?
		satisfy<
			MatchParserContext,
			{
				$: ctx["$"]
				input: ctx["input"]
				cases: [...ctx["cases"], ...cases]
			}
		>
	:	never

type finalizeCases<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> =
	defaultCase extends "never" ? ctx["cases"]
	: defaultCase extends Morph ? [...ctx["cases"], defaultCase]
	: defaultCase extends "assert" ?
		[...ctx["cases"], (In: ctx["input"]) => never]
	:	[...ctx["cases"], (In: ctx["input"]) => ArkError]

// infer the types handled by a match branch, which is identical to `type.infer` while properly
// excluding cases that are already handled by other branches
type inferMatchBranch<def, ctx extends MatchParserContext> = distill.Out<
	inferIntersection<ctx["input"], type.infer<def, ctx["$"]>>
>

type ChainableMatchParser<ctx extends MatchParserContext> = {
	// chainable methods
	case: <def, ret>(
		def: type.validate<def, ctx["$"]>,
		then: (In: inferMatchBranch<def, ctx>) => ret
	) => ChainableMatchParser<
		addCasesToContext<ctx, [(In: inferMatchBranch<def, ctx>) => ret]>
	>

	match: CaseMatchParser<ctx>

	default: DefaultMethod<ctx>
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
		addCasesToContext<
			ctx,
			unionToTuple<cases[Exclude<keyof cases, "default">]>
		>,
		defaultDef
	>
:	ChainableMatchParser<addCasesToContext<ctx, unionToTuple<propValueOf<cases>>>>

type finalizeMatchParser<
	ctx extends MatchParserContext,
	defaultCase extends DefaultCase<ctx>
> = Match<ctx["input"], finalizeCases<ctx, defaultCase>>

export type Match<input = any, cases extends Morph[] = Morph[]> = <
	const data extends input
>(
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
		const parser = new InternalChainedMatchParser($)
		super(parser.match.bind(parser) as never, {
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

	case(when: unknown, then: Morph): this {
		const branch = this.$.parse(when).pipe(then as never)
		this.branches.push(branch)
		return this
	}

	match(
		cases: Record<string, Morph | DefaultCase>
	): InternalChainedMatchParser | {} {
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
	}

	default(defaultCase: DefaultCase): Match {
		if (typeof defaultCase === "function")
			this.case(intrinsic.unknown, defaultCase)

		const matcher = this.$.node("union", {
			branches: this.branches,
			ordered: true
		})

		if (defaultCase === "reject") return matcher as never

		return matcher.assert as never
	}
}

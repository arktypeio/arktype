import type { BaseRoot, Morph } from "@ark/schema"
import type {
	array,
	conform,
	ErrorMessage,
	Fn,
	isDisjoint,
	numericStringKeyOf,
	propValueOf,
	unionToTuple
} from "@ark/util"
import type { distill, inferIntersection } from "./attributes.ts"
import { ark, type type } from "./keywords/keywords.ts"
import type { Scope } from "./scope.ts"

type Thens = array<(In: any) => unknown>

type MatchParserContext = {
	thens: Thens
	$: unknown
	input: unknown
}

export type MatchParser<$> = CaseMatchParser<{
	thens: []
	$: $
	input: unknown
}> & {
	(): ChainableMatchParser<{
		thens: []
		$: $
		input: unknown
	}>
}

type matcherInputs<ctx extends MatchParserContext> = Parameters<
	ctx["thens"][number]
>[0]

type addBranches<
	ctx extends MatchParserContext,
	branches extends readonly unknown[]
> = {
	$: ctx["$"]
	input: ctx["input"]
	thens: conform<[...ctx["thens"], ...branches], Thens>
}

// infer the types handled by a match branch, which is identical to `type.infer` while properly
// excluding cases that are already handled by other branches
type inferMatchBranch<def, ctx extends MatchParserContext> = distill.Out<
	inferIntersection<ctx["input"], type.infer<def, ctx["$"]>>
>

export type ChainableMatchParser<ctx extends MatchParserContext> = {
	// chainable methods
	when: <def, ret>(
		when: type.validate<def, ctx["$"]>,
		then: (In: inferMatchBranch<def, ctx>) => ret
	) => ChainableMatchParser<
		addBranches<ctx, [(In: inferMatchBranch<def, ctx>) => ret]>
	>
	cases: CaseMatchParser<ctx>

	// finalizing methods
	orThrow: () => finalizeMatchParser<
		addBranches<ctx, [(In: matcherInputs<ctx>) => never]>
	>
	default: MatchParserDefaultInvocation<ctx>
	finalize: (
		this: matcherInputs<ctx> extends never ? ChainableMatchParser<ctx>
		:	ErrorMessage<"Cannot manually finalize a non-exhaustive matcher: consider adding a `.default` case, using one of the `.orX` methods, or using `match.only<T>`">
	) => finalizeMatchParser<ctx>
}

type MatchParserDefaultInvocation<ctx extends MatchParserContext> = {
	<f extends (In: matcherInputs<ctx>) => unknown>(
		f: f
	): finalizeWithDefault<ctx, ReturnType<f>>
	<const value>(value: value): finalizeWithDefault<ctx, value>
}

type validateCases<cases, ctx extends MatchParserContext> = {
	[def in keyof cases | keyof ctx["$"] | "default"]?: def extends "default" ?
		(In: matcherInputs<ctx>) => unknown
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferMatchBranch<def, ctx>) => unknown
	:	type.validate<def, ctx["$"]>
}

type errorCases<cases, ctx extends MatchParserContext> = {
	[def in keyof cases]?: def extends "default" ?
		(In: matcherInputs<ctx>) => unknown
	: def extends type.validate<def, ctx["$"]> ?
		(In: inferMatchBranch<def, ctx>) => unknown
	:	type.validate<def, ctx["$"]>
} & {
	[k in Exclude<keyof ctx["$"], keyof cases>]?: (
		In: distill.Out<inferIntersection<matcherInputs<ctx>, ctx["$"][k]>>
	) => unknown
} & {
	default?: (In: matcherInputs<ctx>) => unknown
}

export type CaseMatchParser<ctx extends MatchParserContext> = <cases>(
	def: cases extends validateCases<cases, ctx> ? cases : errorCases<cases, ctx>
) => cases extends { default: (...args: never[]) => infer defaultReturn } ?
	finalizeWithDefault<
		addBranches<ctx, unionToTuple<cases[Exclude<keyof cases, "default">]>>,
		defaultReturn
	>
:	ChainableMatchParser<addBranches<ctx, unionToTuple<propValueOf<cases>>>>

type finalizeWithDefault<
	ctx extends MatchParserContext,
	defaultReturn
> = finalizeMatchParser<
	addBranches<ctx, [(_: matcherInputs<ctx>) => defaultReturn]>
>

type finalizeMatchParser<ctx extends MatchParserContext> = MatchInvocation<{
	thens: ctx["thens"]
	input: ctx["input"]
}>

type MatchInvocationContext = {
	thens: readonly Fn[]
	input: unknown
}

export type MatchInvocation<ctx extends MatchInvocationContext> = <
	const data extends ctx["input"]
>(
	data: data
) => {
	[i in numericStringKeyOf<ctx["thens"]>]: isDisjoint<
		data,
		Parameters<ctx["thens"][i]>[0]
	> extends true ?
		never
	:	ReturnType<ctx["thens"][i]>
}[numericStringKeyOf<ctx["thens"]>]

export const createMatchParser = <$>($: Scope<$>): MatchParser<$> => {
	const matchParser = (isRestricted: boolean) => {
		const handledCases: { when: BaseRoot; then: Morph }[] = []
		let defaultCase: ((x: unknown) => unknown) | null = null

		const parser = {
			when: (when: unknown, then: Morph) => {
				handledCases.push({ when: $.parseRoot(when, {}), then })

				return parser
			},

			finalize: () => {
				const branches = handledCases.flatMap(({ when, then }) => {
					if (when.kind === "union") {
						return when.branches.map(branch => ({
							in: branch,
							morph: then
						}))
					}
					if (when.kind === "morph")
						return [{ in: when, morph: [when.morph, then] }]

					return [{ in: when, morph: then }]
				})
				if (defaultCase)
					branches.push({ in: keywordNodes.unknown, morph: defaultCase })

				const matchers = $.node("union", {
					branches,
					ordered: true
				})
				return matchers.assert
			},

			orThrow: () => {
				// implicitly finalize, we don't need to do anything else because we throw either way
				return parser.finalize()
			},

			default: (x: unknown) => {
				if (x instanceof Function) defaultCase = x as never
				else defaultCase = () => x

				return parser.finalize()
			}
		}

		return parser
	}

	return Object.assign(() => matchParser(false), {
		only: () => matchParser(true)
	}) as never
}

const match = createMatchParser(ark)

match({
	string: s => s.length
})

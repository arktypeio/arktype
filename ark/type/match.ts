import { intrinsic, type BaseRoot, type Morph } from "@ark/schema"
import {
	Callable,
	type array,
	type Fn,
	type isDisjoint,
	type numericStringKeyOf,
	type propValueOf,
	type unionToTuple
} from "@ark/util"
import type { distill, inferIntersection } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { InternalScope } from "./scope.ts"

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

	from<typedInput>(): ChainableMatchParser<{
		thens: []
		$: $
		input: typedInput
	}>
}

type addBranches<
	ctx extends MatchParserContext,
	branches extends readonly unknown[]
> =
	branches extends Thens ?
		{
			$: ctx["$"]
			input: ctx["input"]
			thens: [...ctx["thens"], ...branches]
		}
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
		addBranches<ctx, [(In: inferMatchBranch<def, ctx>) => ret]>
	>
	cases: CaseMatchParser<ctx>

	default: DefaultMethod<ctx>
}

export type DefaultCaseKeyword = "never" | "assert" | "reject"

type DefaultCase<ctx extends MatchParserContext> =
	| DefaultCaseKeyword
	| ((data: ctx["input"]) => unknown)

type DefaultMethod<ctx extends MatchParserContext> = {
	<const def extends DefaultCase<ctx>>(
		def: def
	): finalizeMatchParser<addDefault<ctx, def>>
}

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
		addDefault<
			addBranches<ctx, unionToTuple<cases[Exclude<keyof cases, "default">]>>,
			defaultDef
		>
	>
:	ChainableMatchParser<addBranches<ctx, unionToTuple<propValueOf<cases>>>>

type addDefault<ctx extends MatchParserContext, def extends DefaultCase<ctx>> =
	def extends Fn ? addBranches<ctx, [(_: ctx["input"]) => ReturnType<def>]>
	:	ctx

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

export class InternalMatchParser extends Callable<
	(...args: unknown[]) => BaseRoot
> {
	constructor($: InternalScope) {
		super(
			(..._args) => {
				const matchParser = (_isRestricted: boolean) => {
					const handledCases: { when: BaseRoot; then: Morph }[] = []
					let defaultCase: ((x: unknown) => unknown) | null = null

					const parser = {
						when: (when: unknown, then: Morph) => {
							handledCases.push({
								when: $.parse(when),
								then
							})

							return parser
						},

						finalize: () => {
							const branches = handledCases.flatMap(
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
							if (defaultCase)
								branches.push({ in: intrinsic.unknown, morphs: [defaultCase] })

							const matchers = $.node("union", {
								branches,
								ordered: true
							})
							return matchers.assert
						},
						orThrow: () =>
							// implicitly finalize, we don't need to do anything else because we throw either way
							parser.finalize(),
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
			},
			{
				bind: $
			}
		)
	}
}

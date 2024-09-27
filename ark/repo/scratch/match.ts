// import type { BaseRoot, Morph } from "@ark/schema"
// import type {
// 	ErrorMessage,
// 	Fn,
// 	isDisjoint,
// 	numericStringKeyOf,
// 	override,
// 	propValueOf,
// 	unionToTuple
// } from "@ark/util"
// import type { inferIntersection } from "./intersect.ts"
// import { ambient, type type } from "./keywords/ark.ts"
// import type { distill, Narrowed } from "./keywords/ast.ts"
// import type { Scope } from "./scope.ts"

// type MatchParserContext = {
// 	thens: readonly ((In: unknown) => unknown)[]
// 	$: unknown
// 	exhaustiveOver: unknown
// }

// export type MatchParser<$> = CaseMatchParser<{
// 	thens: []
// 	// "match()" is the same as "match.only<unknown>()"
// 	exhaustiveOver: unknown
// 	$: $
// }> & {
// 	(): ChainableMatchParser<{
// 		thens: []
// 		// "match()" is the same as "match.only<unknown>()"
// 		exhaustiveOver: unknown
// 		$: $
// 	}>
// 	only: <inputs>() => ChainableMatchParser<{
// 		thens: []
// 		exhaustiveOver: inputs
// 		$: $
// 	}>
// }

// type matcherInputs<ctx extends MatchParserContext> = Parameters<
// 	ctx["thens"][number]
// >[0]

// type getHandledBranches<ctx extends MatchParserContext> = Exclude<
// 	matcherInputs<ctx>,
// 	Narrowed
// >

// type getUnhandledBranches<ctx extends MatchParserContext> = distill.Out<
// 	Exclude<ctx["exhaustiveOver"], getHandledBranches<ctx>>
// >

// type addBranches<
// 	ctx extends MatchParserContext,
// 	branches extends unknown[]
// > = override<ctx, { thens: [...ctx["thens"], ...branches] }>

// type validateWhenDefinition<def, ctx extends MatchParserContext> =
// 	def extends type.validate<def, ctx["$"]> ?
// 		inferMatchBranch<def, ctx> extends getHandledBranches<ctx> ?
// 			ErrorMessage<"This branch is redundant and will never be reached">
// 		:	def
// 	:	type.validate<def, ctx["$"]>

// // infer the types handled by a match branch, which is identical to `type.infer` while properly
// // excluding cases that are already handled by other branches
// type inferMatchBranch<def, ctx extends MatchParserContext> = distill.Out<
// 	inferIntersection<getUnhandledBranches<ctx>, type.infer<def, ctx["$"]>>
// >

// export type ChainableMatchParser<ctx extends MatchParserContext> = {
// 	// chainable methods
// 	when: <def, ret>(
// 		when: validateWhenDefinition<def, ctx>,
// 		then: (In: inferMatchBranch<def, ctx>) => ret
// 	) => ChainableMatchParser<
// 		addBranches<ctx, [(In: inferMatchBranch<def, ctx>) => ret]>
// 	>
// 	cases: CaseMatchParser<ctx>

// 	// finalizing methods
// 	orThrow: () => finalizeMatchParser<
// 		addBranches<ctx, [(In: getHandledBranches<ctx>) => never]>
// 	>
// 	default: MatchParserDefaultInvocation<ctx>
// 	finalize: (
// 		this: getUnhandledBranches<ctx> extends never ? ChainableMatchParser<ctx>
// 		:	ErrorMessage<"Cannot manually finalize a non-exhaustive matcher: consider adding a `.default` case, using one of the `.orX` methods, or using `match.only<T>`">
// 	) => finalizeMatchParser<ctx>
// }

// type MatchParserDefaultInvocation<ctx extends MatchParserContext> = {
// 	<f extends (In: getUnhandledBranches<ctx>) => unknown>(
// 		f: f
// 	): finalizeWithDefault<ctx, ReturnType<f>>
// 	<const value>(value: value): finalizeWithDefault<ctx, value>
// }

// type validateCases<cases, ctx extends MatchParserContext> = {
// 	[def in keyof cases | keyof ctx["$"] | "default"]?: def extends "default" ?
// 		(In: getUnhandledBranches<ctx>) => unknown
// 	: def extends validateWhenDefinition<def, ctx> ?
// 		(In: inferMatchBranch<def, ctx>) => unknown
// 	:	validateWhenDefinition<def, ctx>
// }

// type errorCases<cases, ctx extends MatchParserContext> = {
// 	[def in keyof cases]?: def extends "default" ?
// 		(In: getUnhandledBranches<ctx>) => unknown
// 	: def extends validateWhenDefinition<def, ctx> ?
// 		(In: inferMatchBranch<def, ctx>) => unknown
// 	:	validateWhenDefinition<def, ctx>
// } & {
// 	[k in Exclude<keyof ctx["$"], keyof cases>]?: (
// 		In: distill.Out<inferIntersection<getUnhandledBranches<ctx>, ctx["$"][k]>>
// 	) => unknown
// } & {
// 	default?: (In: getUnhandledBranches<ctx>) => unknown
// }

// export type CaseMatchParser<ctx extends MatchParserContext> = <cases>(
// 	def: cases extends validateCases<cases, ctx> ? cases : errorCases<cases, ctx>
// ) => cases extends { default: (...args: never[]) => infer defaultReturn } ?
// 	finalizeWithDefault<
// 		addBranches<ctx, unionToTuple<cases[Exclude<keyof cases, "default">]>>,
// 		defaultReturn
// 	>
// :	ChainableMatchParser<addBranches<ctx, unionToTuple<propValueOf<cases>>>>

// type finalizeWithDefault<
// 	ctx extends MatchParserContext,
// 	defaultReturn
// > = finalizeMatchParser<
// 	addBranches<ctx, [(_: getUnhandledBranches<ctx>) => defaultReturn]>
// >

// type finalizeMatchParser<ctx extends MatchParserContext> = MatchInvocation<{
// 	thens: ctx["thens"]
// 	initialInputs: ctx["exhaustiveOver"]
// }>

// type MatchInvocationContext = {
// 	thens: readonly Fn[]
// 	initialInputs: unknown
// }

// export type MatchInvocation<ctx extends MatchInvocationContext> = <
// 	const data extends ctx["initialInputs"]
// >(
// 	data: data
// ) => {
// 	[i in numericStringKeyOf<ctx["thens"]>]: isDisjoint<
// 		data,
// 		Parameters<ctx["thens"][i]>[0]
// 	> extends true ?
// 		never
// 	:	ReturnType<ctx["thens"][i]>
// }[numericStringKeyOf<ctx["thens"]>]

// export const createMatchParser = <$>($: Scope<$>): MatchParser<$> => {
// 	const matchParser = (isRestricted: boolean) => {
// 		const handledCases: { when: BaseRoot; then: Morph }[] = []
// 		let defaultCase: ((x: unknown) => unknown) | null = null

// 		const parser = {
// 			when: (when: unknown, then: Morph) => {
// 				handledCases.push({ when: $.parseRoot(when, {}), then })

// 				return parser
// 			},

// 			finalize: () => {
// 				const branches = handledCases.flatMap(({ when, then }) => {
// 					if (when.kind === "union") {
// 						return when.branches.map(branch => ({
// 							in: branch,
// 							morph: then
// 						}))
// 					}
// 					if (when.kind === "morph")
// 						return [{ in: when, morph: [when.morph, then] }]

// 					return [{ in: when, morph: then }]
// 				})
// 				if (defaultCase)
// 					branches.push({ in: keywordNodes.unknown, morph: defaultCase })

// 				const matchers = $.node("union", {
// 					branches,
// 					ordered: true
// 				})
// 				return matchers.assert
// 			},

// 			orThrow: () => {
// 				// implicitly finalize, we don't need to do anything else because we throw either way
// 				return parser.finalize()
// 			},

// 			default: (x: unknown) => {
// 				if (x instanceof Function) defaultCase = x as never
// 				else defaultCase = () => x

// 				return parser.finalize()
// 			}
// 		}

// 		return parser
// 	}

// 	return Object.assign(() => matchParser(false), {
// 		only: () => matchParser(true)
// 	}) as never
// }

// const match = createMatchParser(ambient)

// match({
// 	string: s => s.length
// })

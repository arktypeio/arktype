import type { evaluate } from "./generics.js"

export type Trait<
	base = never,
	args extends readonly any[] = readonly any[],
	out = unknown
> = (base: base) => (...args: args) => out

export type composeTraits<
	traits extends readonly unknown[],
	result extends Trait = Trait<{}, [], {}>
> = traits extends [infer head extends Trait, ...infer tail]
	? composeTraits<tail, intersectTraits<result, head>>
	: result

type intersectTraits<l extends Trait, r extends Trait> = [l, r] extends [
	Trait<infer lBase, infer lArgs, infer lOut>,
	Trait<infer rBase, infer rArgs, infer rOut>
]
	? Trait<
			evaluate<lBase & rBase>,
			intersectArgs<lArgs, rArgs>,
			evaluate<lOut & rOut>
	  >
	: never

type intersectArgs<
	l extends readonly unknown[],
	r extends readonly unknown[]
> = l extends readonly [infer lHead, ...infer lTail]
	? r extends readonly [infer rHead, ...infer rTail]
		? readonly [evaluate<lHead & rHead>, ...intersectArgs<lTail, rTail>]
		: l
	: r

type baseOf<trait extends Trait> = trait extends Trait<infer base>
	? base
	: never

type argsOf<trait extends Trait> = trait extends Trait<any, infer args>
	? args
	: never

type outOf<trait extends Trait> = trait extends Trait<any, any, infer out>
	? out
	: never

export const compose =
	<traits extends readonly Trait[]>(...traits: traits) =>
	<implementation extends baseOf<composeTraits<traits>>>(
		implementation: implementation
	) =>
	(...args: argsOf<composeTraits<traits>>) =>
		traits.reduce(
			(base, trait) => Object.assign(base, trait(base as never)(...args)),
			implementation as evaluate<implementation & outOf<composeTraits<traits>>>
		)

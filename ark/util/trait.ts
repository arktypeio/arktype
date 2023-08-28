import type { error } from "./errors.js"
import type { conform, evaluate, mergeAll, satisfy } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { intersectUnion, unionToTuple } from "./unionToTuple.js"

// export interface Trait {
// 	args: readonly any[]
// }

type mergeParameters<
	parameters extends readonly unknown[],
	result extends readonly unknown[] = []
> = parameters extends readonly [
	infer head extends readonly unknown[],
	...infer tail
]
	? mergeParameters<tail, intersectParameters<result, head>>
	: result

export interface Trait {
	$args: readonly unknown[]
}

type EmptyTrait = satisfy<Trait, { $args: [] }>

export type reify<trait> = evaluate<{
	[k in keyof trait as k extends `$${infer name}` ? name : k]: trait[k]
}>

type extractAbstract<trait> = Omit<reify<trait>, keyof trait | "args">

export type TraitConstructor<trait extends Trait> = {
	(
		base: extractAbstract<trait> & ThisType<reify<trait>>
	): (...args: trait["$args"]) => reify<trait>
	$args: trait["$args"]
	implementation: Omit<trait, keyof Trait | `$${string}`>
}

export const trait = <trait extends Trait>(
	implementation: Omit<trait, keyof Trait | `$${string}`> &
		ThisType<reify<trait>>
): TraitConstructor<trait> =>
	Object.assign(
		(base: extractAbstract<trait>) => {
			const prototype = Object.defineProperties(
				base,
				Object.getOwnPropertyDescriptors(implementation)
			)
			return (...args: trait["$args"]) =>
				Object.create(prototype, { args: { value: args } })
		},
		{ implementation } satisfies Omit<TraitConstructor<trait>, "$args"> as never
	)

export type compose<
	traits extends readonly Trait[],
	result extends Trait = EmptyTrait
> = traits extends readonly [
	infer head extends Trait,
	...infer tail extends Trait[]
]
	? compose<tail, intersectTraits<result, head>>
	: result

type intersectTraits<l extends Trait, r extends Trait> = {
	[k in keyof (l & r)]: k extends "$args"
		? intersectParameters<l["$args"], r["$args"]>
		: (l & r)[k]
} & unknown

export const compose = <traits extends readonly Trait[]>(...traits: traits) =>
	trait(
		(traits as readonly Trait[]).reduce(
			(base, trait) =>
				Object.defineProperties(
					base,
					Object.getOwnPropertyDescriptors(trait.implementation)
				),
			{}
		)
	) as {} as TraitConstructor<compose<traits>>

// type validateTraits<
// 	traits extends readonly Trait[],
// 	base extends Trait = EmptyTrait,
// 	result extends Trait[] = []
// > = traits extends readonly [
// 	infer head extends Trait,
// 	...infer tail extends Trait[]
// ]
// 	? validateTraits<
// 			tail,
// 			intersectTraits<base, head>,
// 			[...result, validateExtension<base, head>]
// 	  >
// 	: result

// type validateExtension<l extends Trait, r extends Trait> = [l, r] extends [
// 	Trait<any, infer lImplementation, infer lBase>,
// 	Trait<infer rInput, infer rImplementation, infer rBase>
// ]
// 	? Trait<
// 			rInput,
// 			{
// 				[k in keyof rImplementation]: k extends keyof lImplementation
// 					? error<`Key '${k & string} appears in multiple implementations'`>
// 					: k extends keyof lBase
// 					? rImplementation[k] extends lBase[k]
// 						? rImplementation[k]
// 						: error<`'${k &
// 								string}' incorrectly implements a previous base constraint'`>
// 					: rImplementation[k]
// 			},
// 			{
// 				[k in keyof rBase]: k extends keyof lImplementation
// 					? lImplementation[k] extends rBase[k]
// 						? rBase[k]
// 						: error<`'${k &
// 								string}' conflicts with a previously implemented constraint'`>
// 					: rBase[k]
// 			}
// 	  >
// 	: never

// type intersectTraits<l extends Trait, r extends Trait> = [l, r] extends [
// 	Trait<infer lArgs, infer lImplementation, infer lBase>,
// 	Trait<infer rArgs, infer rImplementation, infer rBase>
// ]
// 	? Trait<
// 			intersectParameters<lArgs, rArgs>,
// 			evaluate<lImplementation & rImplementation>,
// 			evaluate<Omit<lBase & rBase, keyof (lImplementation & rImplementation)>>
// 	  >
// 	: never

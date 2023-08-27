import type { error } from "./errors.js"
import type { conform, evaluate, mergeAll } from "./generics.js"
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
	args: readonly unknown[]
}

export type reify<trait> = evaluate<{
	[k in keyof trait as k extends `$${infer name}` ? name : k]: trait[k]
}>

type extractAbstract<trait> = Omit<reify<trait>, keyof trait>

export const trait = <trait extends Trait>(
	implementation: Omit<trait, `$${string}`> & ThisType<reify<trait>>
) =>
	Object.assign(
		(base: extractAbstract<trait>) => {
			const prototype = Object.defineProperties(
				base,
				Object.getOwnPropertyDescriptors(implementation)
			)
			return (...args: trait["args"]) =>
				Object.create(prototype, { args: { value: args } })
		},
		{ implementation }
	) as {} as {
		(
			base: extractAbstract<trait> & ThisType<reify<trait>>
		): (...args: trait["args"]) => reify<trait>
		implementation: Omit<trait, keyof Trait | `$${string}`>
	}

// type reifyBases<
// 	bases extends readonly unknown[],
// 	result extends Trait = { bases: []; args: [] }
// > = bases extends readonly [infer head extends Trait, ...infer tail]
// 	? reifyBases<
// 			tail,
// 			Omit<result & extractReified<head>, "args"> & {
// 				args: intersectParameters<result["args"], head["args"]>
// 			}
// 	  >
// 	: evaluate<result>

// type reduceAbstract<
// 	bases extends readonly unknown[],
// 	result extends {} = {}
// > = bases extends readonly [infer head, ...infer tail]
// 	? reduceAbstract<tail, result & extractAbstract<head>>
// 	: evaluate<result>

// type unimplemented<trait extends Trait> = evaluate<
// 	extractAbstract<trait> & reduceAbstract<trait["bases"]>
// 	>

// 	export type reify<trait extends Trait> = reifyBases<[...trait["bases"], trait]>

export type compose<
	traits extends readonly Trait[],
	result extends Trait = Trait<[], {}, {}>
> = traits extends readonly [
	infer head extends Trait,
	...infer tail extends Trait[]
]
	? compose<tail, intersectTraits<result, head>>
	: result

export const compose = <traits extends readonly Trait[]>(
	...traits: conform<traits, validateTraits<traits>>
) =>
	trait(
		(traits as Trait[]).reduce(
			(base, trait) =>
				Object.defineProperties(
					base,
					Object.getOwnPropertyDescriptors(trait.implementation)
				),
			{}
		)
	) as compose<traits>

type validateTraits<
	traits extends readonly Trait[],
	base extends Trait = Trait<[], {}, {}>,
	result extends Trait[] = []
> = traits extends readonly [
	infer head extends Trait,
	...infer tail extends Trait[]
]
	? validateTraits<
			tail,
			intersectTraits<base, head>,
			[...result, validateExtension<base, head>]
	  >
	: result

type validateExtension<l extends Trait, r extends Trait> = [l, r] extends [
	Trait<any, infer lImplementation, infer lBase>,
	Trait<infer rInput, infer rImplementation, infer rBase>
]
	? Trait<
			rInput,
			{
				[k in keyof rImplementation]: k extends keyof lImplementation
					? error<`Key '${k & string} appears in multiple implementations'`>
					: k extends keyof lBase
					? rImplementation[k] extends lBase[k]
						? rImplementation[k]
						: error<`'${k &
								string}' incorrectly implements a previous base constraint'`>
					: rImplementation[k]
			},
			{
				[k in keyof rBase]: k extends keyof lImplementation
					? lImplementation[k] extends rBase[k]
						? rBase[k]
						: error<`'${k &
								string}' conflicts with a previously implemented constraint'`>
					: rBase[k]
			}
	  >
	: never

type intersectTraits<l extends Trait, r extends Trait> = [l, r] extends [
	Trait<infer lArgs, infer lImplementation, infer lBase>,
	Trait<infer rArgs, infer rImplementation, infer rBase>
]
	? Trait<
			intersectParameters<lArgs, rArgs>,
			evaluate<lImplementation & rImplementation>,
			evaluate<Omit<lBase & rBase, keyof (lImplementation & rImplementation)>>
	  >
	: never

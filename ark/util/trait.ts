import type { error } from "./errors.js"
import type { conform, evaluate } from "./generics.js"
import type { intersectParameters } from "./intersections.js"

// export interface Trait {
// 	args: readonly any[]
// }

export interface Trait {
	bases: readonly Trait[]
	args: readonly any[]
}

// type TraitConstructor<trait extends Trait = Trait> = {
// 	<extendedArgs extends readonly unknown[] = [], extendedBase = {}>(
// 		base: evaluate<trait["$base"] & extendedBase> &
// 			ThisType<
// 				traitInstance<
// 					intersectParameters<trait["$args"], extendedArgs>,
// 					trait["$implementation"] & extendedBase,
// 					trait["$base"]
// 				>
// 			>
// 	): (
// 		...args: intersectParameters<trait["$args"], extendedArgs>
// 	) => traitInstance<
// 		intersectParameters<trait["$args"], extendedArgs>,
// 		trait["$implementation"] & extendedBase,
// 		trait["$base"]
// 	>
// 	implementation: trait["$implementation"]
// }

// type traitInstance<
// 	args extends readonly unknown[],
// 	implementation extends object,
// 	base extends object
// > = evaluate<{ readonly args: args } & base & implementation>

export type abstractTraitKey<trait extends Trait> = Extract<
	keyof trait,
	`$${string}`
>

export type reify<trait extends Trait> = evaluate<{
	[k in keyof trait as k extends `$${infer name}` ? name : k]: trait[k]
}>

export type futureSelf<trait extends Trait> = reify<trait> &
	reify<trait["bases"][number]>

export const trait = <trait extends Trait>(
	implementation: Omit<trait, keyof Trait | `$${string}`> &
		ThisType<futureSelf<trait>>
) =>
	Object.assign(
		(base: base) => {
			const prototype = Object.defineProperties(
				base,
				Object.getOwnPropertyDescriptors(implementation)
			)
			return (...args: trait["args"]) =>
				Object.create(prototype, { args: { value: args } })
		},
		{ implementation }
	) as {
		(base: base): (...args: trait["args"]) => trait
		implementation: Omit<trait, keyof base>
	}

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

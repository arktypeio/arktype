import type { error } from "./errors.js"
import type { conform, evaluate, mergeAll, satisfy } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { intersectUnion, unionToTuple } from "./unionToTuple.js"

type mergeParameters<
	parameters extends readonly unknown[],
	result extends readonly unknown[] = []
> = parameters extends readonly [
	infer head extends readonly unknown[],
	...infer tail
]
	? mergeParameters<tail, intersectParameters<result, head>>
	: result

export interface TraitDeclaration {
	args: readonly unknown[]
}

type EmptyTrait = satisfy<TraitDeclaration, { $args: [] }>

export type reify<trait> = {
	[k in keyof trait as k extends `$${infer name}` ? name : k]: trait[k]
}

type extractAbstract<trait> = Omit<reify<trait>, keyof trait | "args">

type implementationFor<trait extends TraitDeclaration> = Omit<
	trait,
	`$${string}`
>

export type Trait<declaration> = {
	(
		abstract: extractAbstract<declaration> & ThisType<reify<declaration>>
	): (...args: declaration["$args"]) => reify<declaration>
	$args: declaration["$args"]
	implementation: implementationFor<declaration>
}

export type TraitConstructor = <declaration>(implementation: {
	[k in keyof declaration]: declaration[k]
}) => Trait<declaration>

export const trait: TraitConstructor = (implementation) =>
	Object.assign(
		(base: object) => {
			const prototype = Object.defineProperties(
				base,
				Object.getOwnPropertyDescriptors(implementation)
			)
			return (...args: any[]) =>
				Object.create(prototype, { args: { value: args } })
		},
		{ implementation } satisfies Omit<Trait, "$args"> as never
	)

export type compose<
	traits extends readonly TraitDeclaration[],
	result extends TraitDeclaration = EmptyTrait
> = traits extends readonly [
	infer head extends TraitDeclaration,
	...infer tail extends TraitDeclaration[]
]
	? compose<tail, intersectTraits<result, head>>
	: result

type intersectTraits<l extends TraitDeclaration, r extends TraitDeclaration> = {
	[k in keyof (l & r)]: k extends "$args"
		? intersectParameters<l["$args"], r["$args"]>
		: (l & r)[k]
} & unknown

export const compose = <traits extends readonly TraitDeclaration[]>(
	...traits: traits
) =>
	trait(
		(traits as readonly TraitDeclaration[]).reduce(
			(base, trait) =>
				Object.defineProperties(
					base,
					Object.getOwnPropertyDescriptors(trait.implementation)
				),
			{}
		)
	) as {} as Trait<compose<traits>>

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

import type { error } from "./errors.js"
import type { conform, evaluate } from "./generics.js"
import type { intersectParameters } from "./parameters.js"

export type Trait<
	args extends readonly unknown[] = any,
	implementation extends object = {},
	base extends object = any
> = {
	<extendedArgs extends readonly unknown[] = [], extendedBase = {}>(
		base: evaluate<base & extendedBase> &
			ThisType<
				traitInstance<
					intersectParameters<args, extendedArgs>,
					implementation & extendedBase,
					base
				>
			>
	): (
		...args: intersectParameters<args, extendedArgs>
	) => traitInstance<
		intersectParameters<args, extendedArgs>,
		implementation & extendedBase,
		base
	>
	implementation: implementation
}

type traitInstance<
	args extends readonly unknown[],
	implementation extends object,
	base extends object
> = evaluate<{ readonly args: args } & base & implementation>

export const trait = <
	args extends readonly unknown[],
	implementation extends object,
	base extends object = {}
>(
	implementation: implementation &
		ThisType<traitInstance<args, implementation, base>>
) =>
	Object.assign(
		(base: base) => {
			const prototype = Object.defineProperties(
				base,
				Object.getOwnPropertyDescriptors(implementation)
			)
			return (...args: args) =>
				Object.create(prototype, { args: { value: args } })
		},
		{ implementation }
	) as {} as Trait<args, implementation, base>

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

// const describable = trait<
// 	[{}, { description?: string }],
// 	{ description: string },
// 	{ writeDefaultDescription: () => string }
// >({
// 	get description() {
// 		return this.args[1].description ?? this.writeDefaultDescription()
// 	}
// })

// type Bound = {
// 	kind: "min" | "max"
// 	limit: number
// }

// const boundable = trait<
// 	[{ bounds?: Bound[] }],
// 	{ bounds?: Bound[]; checkBounds(data: never): boolean },
// 	{ sizeOf(data: never): number }
// >({
// 	get bounds() {
// 		return this.args[0].bounds
// 	},
// 	checkBounds(data: never) {
// 		return (
// 			!this.bounds ||
// 			this.bounds.every((bound) =>
// 				bound.kind === "max"
// 					? this.sizeOf(data) < bound.limit
// 					: this.sizeOf(data) > bound.limit
// 			)
// 		)
// 	}
// })

// const boundedDescribed = compose(
// 	describable,
// 	boundable
// )({
// 	writeDefaultDescription: () => "default description",
// 	sizeOf: (data: number) => data + 1
// })

// const result = boundedDescribed({}, { description: "something" }) //?

// console.log(Object.getPrototypeOf(result))

// console.log(Object.keys(result))

// result.sizeOf(5) //?

// result.description //?

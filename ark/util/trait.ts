import type { error } from "./errors.js"
import type { conform, evaluate } from "./generics.js"

export type Trait<
	input = any,
	implementation extends object = {},
	base extends object = any
> = {
	<additionalInput, additionalImplementation = {}>(
		base: evaluate<base & additionalImplementation> &
			ThisType<
				evaluate<
					base &
						implementation &
						additionalImplementation &
						input &
						additionalInput
				>
			>
	): (
		input: evaluate<input & additionalInput>
	) => evaluate<
		base & implementation & additionalImplementation & input & additionalInput
	>
	implementation: implementation
}

export const trait = <
	input,
	implementation extends object,
	base extends object = {}
>(
	implementation: implementation &
		ThisType<evaluate<input & implementation & base>>
): Trait<input, implementation, base> =>
	Object.assign(
		(base: base) => {
			const prototype = Object.defineProperties(
				base,
				Object.getOwnPropertyDescriptors(implementation)
			)
			return (input: input) =>
				Object.create(prototype, Object.getOwnPropertyDescriptors(input))
		},
		{ implementation }
	)

export type compose<
	traits extends readonly Trait[],
	result extends Trait = Trait<{}, {}, {}>
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
	base extends Trait = Trait<{}, {}, {}>,
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
	Trait<infer lInput, infer lImplementation, infer lBase>,
	Trait<infer rInput, infer rImplementation, infer rBase>
]
	? Trait<
			evaluate<lInput & rInput>,
			evaluate<lImplementation & rImplementation>,
			evaluate<Omit<lBase & rBase, keyof (lImplementation & rImplementation)>>
	  >
	: never

const describable = trait<
	{ description?: string },
	{ describe: () => string },
	{ writeDefaultDescription: () => string }
>({
	describe() {
		return this.description ?? this.writeDefaultDescription()
	}
})

type Bound = {
	kind: "min" | "max"
	limit: number
}

const boundable = trait<
	{ bounds?: Bound[] },
	{ checkBounds(data: never): boolean },
	{ sizeOf(data: never): number }
>({
	checkBounds(data: never) {
		return (
			!this.bounds ||
			this.bounds.every((bound) =>
				bound.kind === "max"
					? this.sizeOf(data) < bound.limit
					: this.sizeOf(data) > bound.limit
			)
		)
	}
})

// const t = describable({ writeDefaultDescription: () => "foo" })

// const u = t({})

// u.describe() //?

// const boundedDescribed = compose(
// 	describable,
// 	boundable
// )({
// 	writeDefaultDescription: () => "default description",
// 	sizeOf: (data: number) => data + 1
// })

// const result = boundedDescribed({ description: "something" }) //?

// console.log(Object.getPrototypeOf(result))

// console.log(Object.keys(result))

// result.sizeOf(5) //? 6

// result.description //? "something"

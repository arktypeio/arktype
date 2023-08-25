import type { evaluate } from "./generics.js"

export type Trait<
	input = any,
	implementation extends object = {},
	base extends object = any
> = {
	(base: base): (input: input) => evaluate<base & implementation & input>
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

export const compose = <traits extends readonly Trait[]>(...traits: traits) =>
	trait(
		traits.reduce(
			(base, trait) => Object.assign(base, trait.implementation),
			{}
		)
	) as compose<traits>

type intersectTraits<l extends Trait, r extends Trait> = [l, r] extends [
	Trait<infer lInput, infer lImplementation, infer lBase>,
	Trait<infer rInput, infer rImplementation, infer rBase>
]
	? Trait<
			evaluate<lInput & rInput>,
			evaluate<lImplementation & rImplementation>,
			evaluate<lBase & rBase>
	  >
	: never

// const describable = trait<
// 	{ description?: string },
// 	{ describe: () => string },
// 	{ writeDefaultDescription: () => string }
// >({
// 	describe() {
// 		return this.description ?? this.writeDefaultDescription()
// 	}
// })

// type Bound = {
// 	kind: "min" | "max"
// 	limit: number
// }

// const boundable = trait<
// 	{ bounds?: Bound[] },
// 	{ checkBounds(data: never): boolean },
// 	{ sizeOf(data: never): number }
// >({
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

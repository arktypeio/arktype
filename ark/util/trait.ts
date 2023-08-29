import type { evaluate, merge } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { AbstractableConstructor } from "./objectKinds.js"
import { DynamicBase } from "./records.js"

// @ts-expect-error (otherwise can't dynamically add abstracted props)
export abstract class Trait<
	abstracts extends {} = {}
> extends DynamicBase<abstracts> {
	constructor(abstracts: abstracts) {
		throw new Error(`Traits cannot be constructed directly`)
		super(abstracts)
	}
	abstract args: readonly unknown[]
}

export const implement = <
	trait extends AbstractableConstructor<Trait>,
	implementation extends ConstructorParameters<trait>[0]
>(
	trait: trait,
	implementation: implementation &
		ThisType<merge<InstanceType<trait>, implementation>>
) => {
	const prototype = Object.defineProperties(
		implementation,
		Object.getOwnPropertyDescriptors(trait.prototype)
	)
	return (
		...args: InstanceType<trait>["args"]
	): merge<InstanceType<trait>, implementation> =>
		Object.create(prototype, {
			args: {
				value: args
			}
		})
}

export const compose = <
	traits extends readonly AbstractableConstructor<Trait>[]
>(
	...traits: traits
) =>
	({
		prototype: traits.reduce(
			(base, trait) =>
				Object.defineProperties(
					base,
					Object.getOwnPropertyDescriptors(trait.prototype)
				),
			{}
		)
	}) as compose<traits>

export type compose<
	traits extends readonly AbstractableConstructor<Trait>[],
	args extends readonly unknown[] = [],
	abstracted extends {} = {},
	implemented = {}
> = traits extends readonly [
	infer head extends AbstractableConstructor,
	...infer tail extends AbstractableConstructor<Trait>[]
]
	? compose<
			tail,
			intersectParameters<args, InstanceType<head>["args"]>,
			abstracted & ConstructorParameters<head>[0],
			implemented &
				Omit<InstanceType<head>, keyof ConstructorParameters<head>[0] | "args">
	  >
	: abstract new (
			abstracted: evaluate<abstracted>
	  ) => evaluate<{ args: args } & implemented>

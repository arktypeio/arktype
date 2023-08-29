import type { evaluate, merge } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { NonEmptyList } from "./lists.js"
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

export type TraitConstructor<
	trait extends AbstractableConstructor<Trait> = AbstractableConstructor<Trait>
> = <implementation extends ConstructorParameters<trait>[0]>(
	implementation: implementation &
		ThisType<merge<InstanceType<trait>, implementation>>
) => (
	...args: InstanceType<trait>["args"]
) => merge<InstanceType<trait>, implementation>

export const implement =
	<
		traits extends NonEmptyList<AbstractableConstructor<Trait>>,
		composed extends compose<traits> = compose<traits>
	>(
		...traits: traits
	): TraitConstructor<composed> =>
	(implementation) => {
		const prototype = Object.defineProperties(
			implementation,
			Object.getOwnPropertyDescriptors(compose(...traits).prototype)
		)
		return (...args) =>
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

export type compose<traits extends readonly AbstractableConstructor<Trait>[]> =
	traits extends readonly [
		infer head extends AbstractableConstructor,
		...infer tail
	]
		? // if it's only a single trait, return it directly to preserve nominal types, arg labels, etc.
		  tail["length"] extends 0
			? head
			: composeRecurse<tail, partsOf<head>>
		: typeof Trait<{}>

type TraitParts = {
	args: readonly unknown[]
	abstracted: {}
	implemented: {}
}

type partsOf<trait extends AbstractableConstructor> = {
	args: InstanceType<trait>["args"]
	abstracted: ConstructorParameters<trait>[0]
	implemented: Omit<
		InstanceType<trait>,
		keyof ConstructorParameters<trait>[0] | "args"
	>
}

type composeRecurse<
	traits extends readonly unknown[],
	parts extends TraitParts
> = traits extends readonly [
	infer head extends AbstractableConstructor,
	...infer tail
]
	? composeRecurse<
			tail,
			{
				args: intersectParameters<parts["args"], partsOf<head>["args"]>
				abstracted: parts["abstracted"] & partsOf<head>["abstracted"]
				implemented: parts["implemented"] & partsOf<head>["implemented"]
			}
	  >
	: abstract new (
			abstracted: evaluate<parts["abstracted"]>
	  ) => evaluate<{ args: parts["args"] } & parts["implemented"]>

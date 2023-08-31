import type { conform, evaluate, merge } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { NonEmptyList } from "./lists.js"
import type { AbstractableConstructor } from "./objectKinds.js"
import { DynamicBase } from "./records.js"

// @ts-expect-error (otherwise can't dynamically add abstracted props)
export abstract class Trait<
	abstracts extends {} = {},
	init extends {} = {}
> extends DynamicBase<abstracts & init> {
	constructor(abstracts: abstracts, initializes: init) {
		throw new Error(`Traits cannot be constructed directly`)
		super("unnecessary" as never)
	}

	protected abstract init(...args: never[]): init
}

type selfOf<
	trait extends AbstractableConstructor<Trait>,
	implementation
> = {} extends implementation
	? InstanceType<trait>
	: merge<InstanceType<trait>, implementation>

export type TraitConstructor<
	trait extends AbstractableConstructor<Trait> = AbstractableConstructor<Trait>
> = <implementation extends partsOf<trait>["abstracted"]>(
	implementation: implementation & ThisType<selfOf<trait, implementation>>
) => (...args: partsOf<trait>["args"]) => selfOf<trait, implementation>

export const implement =
	<
		traits extends readonly AbstractableConstructor<Trait>[],
		composed extends compose<traits> = compose<traits>
	>(
		...traits: traits
	): TraitConstructor<composed> =>
	(...implementation) => {
		const prototype = Object.defineProperties(
			implementation[0] ?? {},
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
		infer head extends AbstractableConstructor<Trait>,
		...infer tail
	]
		? // if it's only a single trait, return it directly to preserve nominal types, arg labels, etc.
		  tail["length"] extends 0
			? head
			: composeRecurse<tail, partsOf<head>>
		: typeof Trait

type TraitParts = {
	args: readonly unknown[]
	abstracted: {}
	implemented: {}
}

interface partsOf<trait extends AbstractableConstructor<Trait>> {
	args: Parameters<InstanceType<trait>["init"]>
	abstracted: ConstructorParameters<trait>[0]
	implemented: Omit<InstanceType<trait>, keyof this["abstracted"] | "init">
}

type composeRecurse<
	traits extends readonly unknown[],
	parts extends TraitParts
> = traits extends readonly [
	infer head extends AbstractableConstructor<Trait>,
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
	  ) => evaluate<parts["implemented"]>

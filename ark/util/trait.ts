import type { evaluate, merge } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { AbstractableConstructor } from "./objectKinds.js"
import { DynamicBase } from "./records.js"

// @ts-expect-error (otherwise can't dynamically add abstracted props)
export abstract class Trait<
	args extends readonly unknown[] = readonly unknown[],
	props extends {} = {},
	requires extends {} = {}
> extends DynamicBase<requires & props> {
	protected declare args: args

	constructor(args: args, props: props, requires: requires) {
		throw new Error(`Traits cannot be constructed directly`)
		super("unnecessary" as never)
	}

	protected declare initialize: () => props
}

type selfOf<
	trait extends AbstractableConstructor<Trait>,
	implementation
> = InstanceType<trait> extends implementation
	? // maintain the original name if possible
	  InstanceType<trait>
	: merge<InstanceType<trait>, implementation>

export type TraitConstructor<
	trait extends AbstractableConstructor<Trait> = AbstractableConstructor<Trait>
> = <implementation extends partsOf<trait>["requires"]>(
	implementation: implementation & ThisType<selfOf<trait, implementation>>
) => (...args: partsOf<trait>["args"]) => selfOf<trait, implementation>

export const implement =
	<traits extends readonly AbstractableConstructor<Trait>[]>(
		...traits: traits
	): TraitConstructor<compose<traits>> =>
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
		: typeof Trait<[]>

type TraitParts = {
	args: readonly unknown[]
	requires: {}
	self: {}
	props: {}
}

interface partsOf<trait extends AbstractableConstructor<Trait>> {
	args: ConstructorParameters<trait>[0]
	props: ConstructorParameters<trait>[1]
	requires: ConstructorParameters<trait>[2]
	self: InstanceType<trait>
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
				requires: parts["requires"] & partsOf<head>["requires"]
				self: parts["self"] & partsOf<head>["self"]
				props: parts["props"] & partsOf<head>["props"]
			}
	  >
	: abstract new (
			args: parts["args"],
			props: evaluate<parts["props"]>,
			requires: evaluate<parts["requires"]>
	  ) => InstanceType<
			typeof Trait<
				parts["args"],
				evaluate<parts["self"]>,
				evaluate<parts["requires"]>
			>
	  >

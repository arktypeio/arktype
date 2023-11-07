import type { intersectParameters } from "./intersections.js"
import type { applyElementLabels } from "./labels.js"
import type { NonEmptyList } from "./lists.js"
import { type AbstractableConstructor } from "./objectKinds.js"

export type ComposeSignatures = {
	<traits extends NonEmptyList<AbstractableConstructor>>(
		...traits: traits
	): compose<traits>

	<labels extends 1[]>(): <
		traits extends NonEmptyList<AbstractableConstructor>
	>(
		...traits: traits
	) => compose<traits, labels>
}

export const compose = ((...args: readonly AbstractableConstructor[]) => {
	if (args.length === 0) {
		return compose
	}
	const traits = args as readonly AbstractableConstructor[]
	let result = Object
	for (let i = 0; i < traits.length; i++) {
		result = Object.setPrototypeOf(result, traits[i].prototype)
	}
	return result
}) as ComposeSignatures

export type compose<
	traits extends readonly AbstractableConstructor[],
	labels extends 1[] = []
> = composeRecurse<traits, [], {}, labels>

export type composeRecurse<
	traits extends readonly unknown[],
	parameters extends readonly unknown[],
	instance extends {},
	labels extends 1[]
> = traits extends readonly [
	abstract new (...args: infer nextArgs) => infer nextInstance,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<parameters, nextArgs>,
			instance & nextInstance,
			labels
	  >
	: abstract new (...args: applyElementLabels<parameters, labels>) => instance

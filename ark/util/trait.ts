import type { intersectParameters } from "./intersections.ts"
import type { applyElementLabels } from "./labels.ts"
import type { NonEmptyList } from "./lists.ts"
import type { Constructor } from "./objectKinds.ts"

export type ComposeSignatures = {
	<traits extends NonEmptyList<Constructor>>(...traits: traits): compose<traits>

	<labels extends 1[]>(): <traits extends NonEmptyList<Constructor>>(
		...traits: traits
	) => compose<traits, labels>
}

export const compose = ((...args: readonly Constructor[]) => {
	if (args.length === 0) {
		return compose
	}
	const traits = args as readonly Constructor[]
	let result = Object
	for (let i = 0; i < traits.length; i++) {
		result = Object.setPrototypeOf(result, traits[i].prototype)
	}
	return result
}) as ComposeSignatures

export type compose<
	traits extends readonly Constructor[],
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

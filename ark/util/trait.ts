import type { intersectParameters } from "./intersections.js"
import type { applyElementLabels } from "./labels.js"
import { type AbstractableConstructor } from "./objectKinds.js"

export const compose = <traits extends readonly AbstractableConstructor[]>(
	...traits: traits
) => {
	let result = Object
	for (let i = 0; i < traits.length; i++) {
		result = Object.setPrototypeOf(result, traits[i].prototype)
	}
	return result as {} as compose<traits>
}

export const composeWithLabels =
	<labels extends 1[]>() =>
	<traits extends readonly AbstractableConstructor[]>(...traits: traits) =>
		compose(...traits) as compose<traits, labels>

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
	infer head extends AbstractableConstructor,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<parameters, ConstructorParameters<head>>,
			instance & InstanceType<head>,
			labels
	  >
	: abstract new (...args: applyElementLabels<parameters, labels>) => instance

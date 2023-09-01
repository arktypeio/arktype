import type { intersectParameters } from "./intersections.js"
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

export type compose<traits extends readonly AbstractableConstructor[]> =
	composeRecurse<traits, [], {}>

export type composeRecurse<
	traits extends readonly unknown[],
	parameters extends readonly unknown[],
	instance extends {}
> = traits extends readonly [
	infer head extends AbstractableConstructor,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<parameters, ConstructorParameters<head>>,
			instance & InstanceType<head>
	  >
	: abstract new (...args: parameters) => instance

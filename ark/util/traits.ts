import type { intersectParameters } from "./intersections.js"
import type { Constructor } from "./objectKinds.js"

export type TraitComposition = <traits extends readonly Constructor[]>(
	...traits: traits
) => compose<traits>

export const traitsOf = Symbol("hasTraits")

export abstract class Trait {
	static [Symbol.hasInstance](o: any) {
		return Array.isArray(o[traitsOf]) && o[traitsOf].includes(this)
	}
}

const collectPrototypeDescriptors = (trait: Function) => {
	let proto = trait.prototype
	let result: PropertyDescriptorMap = {}
	do {
		// ensure prototypes are sorted from lowest to highest precedence
		result = Object.assign(Object.getOwnPropertyDescriptors(proto), result)
		proto = Object.getPrototypeOf(proto)
	} while (proto !== Object.prototype && proto !== null)

	return result
}

export const compose = ((...traits: Function[]) => {
	const base: any = function (this: any, ...args: any[]) {
		for (const trait of traits) {
			Object.assign(this, Reflect.construct(trait, args, this.constructor))
		}
		Object.defineProperty(this, traitsOf, { value: traits, enumerable: false })
	}

	for (const trait of traits) {
		Object.defineProperties(base.prototype, collectPrototypeDescriptors(trait))
	}
	return base
}) as TraitComposition

export type compose<traits extends readonly Constructor[]> = composeRecurse<
	traits,
	[],
	{}
>

export type composeRecurse<
	traits extends readonly unknown[],
	parameters extends readonly unknown[],
	instance extends {}
> = traits extends readonly [
	abstract new (...args: infer nextArgs) => infer nextInstance,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<parameters, nextArgs>,
			instance & nextInstance
	  >
	: abstract new (...args: parameters) => instance

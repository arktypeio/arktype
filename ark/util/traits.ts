import type { intersectParameters } from "./intersections.js"
import type { Constructor } from "./objectKinds.js"

export type TraitComposition = <traits extends readonly Constructor[]>(
	...traits: traits
) => compose<traits>

// even though the value we attach will be identical, we use this so classes
// won't be treated as instanceof a Trait
const implementedTraits = Symbol("implementedTraits")

export abstract class Trait {
	static [Symbol.hasInstance](o: object) {
		return (
			implementedTraits in o.constructor &&
			(o.constructor[implementedTraits] as Function[]).includes(this)
		)
	}

	traitsOf(): readonly Function[] {
		return implementedTraits in this.constructor
			? (this.constructor[implementedTraits] as Function[])
			: []
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
	if (traits.length === 0) {
		return Object
	}
	if (traits.length === 1) {
		return traits[0]
	}
	const base: any = function (this: any, ...args: any[]) {
		for (const trait of traits) {
			const instance = Reflect.construct(trait, args, this.constructor)
			Object.assign(this, instance)
		}
	}
	const flatImplementedTraits: Function[] = []
	for (const trait of traits) {
		// copy static properties
		Object.assign(base, trait)
		// flatten and copy prototype
		Object.defineProperties(base.prototype, collectPrototypeDescriptors(trait))
		if (implementedTraits in trait) {
			// add any ancestor traits from which the current trait was composed
			for (const innerTrait of trait[implementedTraits] as Function[]) {
				if (!flatImplementedTraits.includes(innerTrait)) {
					flatImplementedTraits.push(innerTrait)
				}
			}
		}
		if (!flatImplementedTraits.includes(trait)) {
			flatImplementedTraits.push(trait)
		}
	}
	Object.defineProperty(base, implementedTraits, {
		value: flatImplementedTraits,
		enumerable: false
	})
	return base
}) as TraitComposition

export type compose<traits extends readonly Constructor[]> = composeRecurse<
	traits,
	[],
	{},
	{}
>

export type composeRecurse<
	traits extends readonly unknown[],
	parameters extends readonly unknown[],
	statics extends {},
	instance extends {}
> = traits extends readonly [
	abstract new (...args: infer nextArgs) => infer nextInstance,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<parameters, nextArgs>,
			statics & { [k in keyof traits[0]]: traits[0][k] },
			instance & nextInstance
	  >
	: statics & (abstract new (...args: parameters) => instance)

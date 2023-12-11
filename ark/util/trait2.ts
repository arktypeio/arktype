import { hasDomain } from "./domain.js"
import type { ErrorMessage } from "./errors.js"
import type { conform, evaluate } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import {
	ancestorsOf,
	type Constructor,
	type instanceOf
} from "./objectKinds.js"
import { NoopBase, type valueOf } from "./records.js"

export type TraitComposition = {
	// <
	// 	traits extends readonly TraitConstructor[],
	// 	disambiguation extends disambiguationOf<traits>
	// >(
	// 	traits: conform<traits, validateTraits<traits, disambiguation>>,
	// 	disambiguation: disambiguation
	// ): compose<traits>

	<traits extends readonly TraitConstructor[]>(
		...traits: traits //, validateTraits<traits, {}>>
	): compose<traits> extends infer composed extends ComposedTraits
		? <implementation extends composed["abstracted"]>(
				implementation: implementation
		  ) => evaluate<composed["statics"]> &
				(abstract new (
					...args: composed["params"]
				) => evaluate<composed["implemented"]>)
		: never
}

// type disambiguationOf<traits extends readonly Constructor[]> = {
// 	[k in ambiguousKeyOf<traits>]: traitsWithKey<traits, k>[number]
// }

// even though the value we attach will be identical, we use this so classes
// won't be treated as instanceof a Trait
const implementedTraits = Symbol("implementedTraits")

export const hasTrait = (traitClass: Constructor) => (o: unknown) => {
	if (!hasDomain(o, "object")) {
		return false
	}
	if (
		implementedTraits in o.constructor &&
		(o.constructor[implementedTraits] as Function[]).includes(traitClass)
	) {
		return true
	}
	// emulate standard instanceof behavior
	return ancestorsOf(o).includes(traitClass)
}

// @ts-expect-error allow abstract property access
export abstract class Trait<t extends object = {}> extends NoopBase<t> {
	declare $abstracts: t

	static get [Symbol.hasInstance]() {
		return hasTrait(this)
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

type TraitConstructor<
	params extends readonly unknown[] = any[],
	implemented = {},
	abstracted = {},
	statics = {}
> = statics &
	(new (...args: params) => {
		$abstracts: abstracted
	} & implemented)

export type ComposedTraits = {
	params: readonly unknown[]
	implemented: unknown
	abstracted: unknown
	statics: unknown
}

export type compose<traits extends readonly TraitConstructor[]> =
	composeRecurse<traits, [], {}, {}, {}>

export type composeRecurse<
	traits extends readonly unknown[],
	params extends readonly unknown[],
	implemented,
	abstracted,
	statics
> = traits extends readonly [
	TraitConstructor<
		infer nextParams,
		infer nextImplemented,
		infer nextAbstracted,
		infer nextStatics
	>,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<params, nextParams>,
			implemented & nextImplemented,
			abstracted & nextAbstracted,
			statics & nextStatics
	  >
	: {
			params: params
			implemented: evaluate<implemented>
			abstracted: evaluate<abstracted>
			statics: evaluate<statics>
	  }

export type Disambiguation = Record<PropertyKey, Constructor>

// type validateTraits<
// 	traits extends readonly unknown[],
// 	disambiguation extends Disambiguation,
// 	instance = {}
// > = traits extends readonly [
// 	abstract new (...args: infer nextArgs) => infer nextInstance,
// 	...infer tail
// ]
// 	? [
// 			abstract new (
// 				...args: nextArgs
// 			) => validateExtension<instance, nextInstance, disambiguation>,
// 			...validateTraits<tail, disambiguation, instance & nextInstance>
// 	  ]
// 	: []

// type validateExtension<base, next, disambiguation extends Disambiguation> = {
// 	[k in keyof next]: k extends Exclude<keyof base, keyof Trait>
// 		? k extends keyof disambiguation
// 			? next[k]
// 			: ErrorMessage<`Key '${k & string} appears in multiple implementations'`>
// 		: next[k]
// }

// type traitsWithKey<
// 	traits extends readonly unknown[],
// 	k extends PropertyKey,
// 	result extends unknown[] = []
// > = traits extends readonly [Constructor<infer instance>, ...infer tail]
// 	? traitsWithKey<
// 			tail,
// 			k,
// 			k extends keyof instance ? [...result, traits[0]] : result
// 	  >
// 	: result

// export type ambiguousKeyOf<traits extends readonly Constructor[]> = valueOf<{
// 	[k in Exclude<keyof instanceOf<compose<traits>>, keyof Trait>]: traitsWithKey<
// 		traits,
// 		k
// 	>["length"] extends 1
// 		? never
// 		: k
// }>

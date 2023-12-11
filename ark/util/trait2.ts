import { hasDomain } from "./domain.js"
import type { evaluate } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { filter } from "./lists.js"
import { ancestorsOf, type Constructor } from "./objectKinds.js"
import { NoopBase, type optionalizeKeys } from "./records.js"

export type TraitComposition = {
	<traits extends readonly TraitConstructor[]>(
		...traits: traits
	): compose<traits> extends infer composed extends ComposedTraits
		? <implementation extends baseImplementationOf<traits, composed>>(
				implementation: implementation &
					ThisType<implementation & composed["implemented"]>
		  ) => composed["statics"] &
				(abstract new (
					...args: composed["params"]
				) => evaluate<implementation & composed["implemented"]>)
		: never
}

type optionalizeSatisfied<implementation> = optionalizeKeys<
	implementation,
	{
		[k in keyof implementation]: undefined extends implementation[k] ? k : never
	}[keyof implementation]
>

type baseImplementationOf<
	traits extends readonly TraitConstructor[],
	composed extends ComposedTraits
> = optionalizeSatisfied<{
	[k in keyof composed["abstracted"]]: k extends keyof composed["implemented"]
		? composed["implemented"][k] extends composed["abstracted"][k]
			? filter<
					traits,
					TraitConstructor<any[], { [_ in k]: unknown }>
			  > extends infer implementations extends TraitConstructor[]
				? implementations["length"] extends 1
					? composed["implemented"][k] | undefined
					: composed["implemented"][k]
				: never
			: composed["abstracted"][k] & composed["implemented"][k]
		: composed["abstracted"][k]
}>

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

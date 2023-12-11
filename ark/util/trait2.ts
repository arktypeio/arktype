import { hasDomain } from "./domain.js"
import type { conform, evaluate } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { filter } from "./lists.js"
import { ancestorsOf, type Constructor } from "./objectKinds.js"
import { NoopBase, type optionalizeKeys } from "./records.js"

export type TraitComposition = {
	<traits extends readonly TraitConstructor[]>(
		...traits: traits
	): compose<traits> extends infer composed extends ComposedTraits
		? <implementation>(
				implementation: conform<
					implementation,
					baseImplementationOf<composed>
				> &
					ThisType<implementation & composed["implemented"]>,
				...disambiguation: baseDisambiguationOf<
					traits,
					implementation,
					composed
				> extends infer disambiguation
					? {} extends disambiguation
						? []
						: [disambiguation]
					: never
		  ) => composed["statics"] &
				(abstract new (
					...args: composed["params"]
				) => evaluate<
					intersectImplementations<implementation, composed["implemented"]>
				>)
		: never
}

type optionalizeSatisfied<base> = optionalizeKeys<
	base,
	{
		[k in keyof base]: undefined extends base[k] ? k : never
	}[keyof base]
>

type baseImplementationOf<composed extends ComposedTraits> =
	optionalizeSatisfied<{
		[k in keyof composed["abstracted"]]: k extends keyof composed["implemented"]
			? composed["implemented"][k] extends composed["abstracted"][k]
				? composed["implemented"][k] | undefined
				: composed["abstracted"][k] & composed["implemented"][k]
			: composed["abstracted"][k]
	}>

type omitUnambiguous<base> = Omit<
	base,
	{
		[k in keyof base]: undefined extends base[k] ? k : never
	}[keyof base]
>

type baseDisambiguationOf<
	traits extends readonly TraitConstructor[],
	implementation,
	composed extends ComposedTraits
> = omitUnambiguous<{
	[k in keyof composed["implemented"]]: k extends keyof implementation
		? undefined
		: k extends keyof Trait
		  ? undefined
		  : filter<
						traits,
						TraitConstructor<any[], { [_ in k]: unknown }>
		      > extends infer implementations extends TraitConstructor[]
		    ? implementations["length"] extends 1
					? undefined
					: implementations[number]
		    : never
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

	traitsOf(): readonly TraitConstructor[] {
		return implementedTraits in this.constructor
			? (this.constructor[implementedTraits] as TraitConstructor[])
			: []
	}
}

type Disambiguation = Record<string, TraitConstructor>

const collectPrototypeDescriptors = (
	trait: TraitConstructor,
	disambiguation: Disambiguation
) => {
	let proto = trait.prototype
	let result: PropertyDescriptorMap = {}
	do {
		// ensure prototypes are sorted from lowest to highest precedence
		result = Object.assign(Object.getOwnPropertyDescriptors(proto), result)
		proto = Object.getPrototypeOf(proto)
	} while (proto !== Object.prototype && proto !== null)
	for (const k in disambiguation) {
		if (disambiguation[k] !== trait) {
			// remove keys disambiguated to resolve to other traits
			delete result[k]
		}
	}
	return result
}

export const compose = ((...traits: TraitConstructor[]) =>
	(implementation: object, disambiguation: Disambiguation = {}) => {
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
		const flatImplementedTraits: TraitConstructor[] = []
		for (const trait of traits) {
			// copy static properties
			Object.assign(base, trait)
			// flatten and copy prototype
			Object.defineProperties(
				base.prototype,
				collectPrototypeDescriptors(trait, disambiguation)
			)
			if (implementedTraits in trait) {
				// add any ancestor traits from which the current trait was composed
				for (const innerTrait of trait[
					implementedTraits
				] as TraitConstructor[]) {
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
		// copy implementation last since it overrides traits
		Object.defineProperties(
			base.prototype,
			Object.getOwnPropertyDescriptors(implementation)
		)
		return base
	}) as TraitComposition

type TraitConstructor<
	params extends readonly unknown[] = any[],
	instance = {},
	abstracted = {},
	statics = {}
> = statics &
	(new (...args: params) => {
		$abstracts: abstracted
	} & instance)

export type ComposedTraits = {
	params: readonly unknown[]
	implemented: unknown
	abstracted: unknown
	statics: unknown
}

export type compose<traits extends readonly TraitConstructor[]> =
	composeRecurse<traits, [], {}, {}, {}>

type intersectImplementations<l, r> = {
	[k in keyof l]: k extends keyof r
		? l[k] extends (...args: infer lArgs) => infer lReturn
			? r[k] extends (...args: infer rArgs) => infer rReturn
				? // ensure function intersections aren't handled as overloads which leads to unsafe behavior
				  (...args: intersectParameters<lArgs, rArgs>) => lReturn & rReturn
				: l[k] & r[k]
			: l[k] & r[k]
		: l[k]
} & Omit<r, keyof l>

type composeRecurse<
	traits extends readonly unknown[],
	params extends readonly unknown[],
	implemented,
	abstracted,
	statics
> = traits extends readonly [
	TraitConstructor<
		infer nextParams,
		infer nextInstance,
		infer nextAbstracted,
		infer nextStatics
	>,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<params, nextParams>,
			intersectImplementations<
				implemented,
				Omit<nextInstance, keyof nextAbstracted>
			>,
			intersectImplementations<abstracted, nextAbstracted>,
			intersectImplementations<statics, nextStatics>
	  >
	: {
			params: params
			implemented: evaluate<implemented>
			abstracted: evaluate<abstracted>
			statics: evaluate<statics>
	  }

import { hasDomain } from "./domain.js"
import type { conform } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import type { List } from "./lists.js"
import { ancestorsOf, type Constructor } from "./objectKinds.js"
import { NoopBase, type override } from "./records.js"

export type TraitComposition = <
	traits extends unknown[],
	s extends CompositionState = compose<traits>
>(
	...traits: conform<traits, s["validated"]>
) => TraitConstructor<
	s["params"],
	s["implemented"],
	s["statics"],
	s["abstractMethods"],
	s["abstractProps"]
>

// even though the value we attach will be identical, we use this so classes
// won't be treated as instanceof a Trait
const implementedTraits = Symbol("implementedTraits")

export const hasTrait =
	(traitClass: Constructor) =>
	(o: unknown): boolean => {
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
export abstract class Trait<
	abstractMethods extends object = {},
	abstractProps extends object = {}
> extends NoopBase<abstractMethods & abstractProps> {
	declare abstractMethods: abstractMethods
	declare abstractProps: abstractProps

	static get [Symbol.hasInstance](): (o: unknown) => boolean {
		return hasTrait(this)
	}

	traitsOf(): readonly TraitConstructor[] {
		return implementedTraits in this.constructor
			? (this.constructor[implementedTraits] as TraitConstructor[])
			: []
	}
}

const collectPrototypeDescriptors = (trait: TraitConstructor) => {
	let proto = trait.prototype
	let result: PropertyDescriptorMap = {}
	do {
		// ensure prototypes are sorted from lowest to highest precedence
		result = Object.assign(Object.getOwnPropertyDescriptors(proto), result)
		proto = Object.getPrototypeOf(proto)
	} while (proto !== Object.prototype && proto !== null)
	return result
}

export const compose: TraitComposition = (...traits: TraitConstructor[]) => {
	const base: any = function (this: Trait, ...args: any[]) {
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
		Object.defineProperties(base.prototype, collectPrototypeDescriptors(trait))
		if (implementedTraits in trait) {
			// add any ancestor traits from which the current trait was composed
			for (const innerTrait of trait[implementedTraits] as TraitConstructor[]) {
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
	Object.defineProperties(base.prototype, Object.getOwnPropertyDescriptors({}))
	return base
}

export type TraitConstructor<
	params extends List = any[],
	instance extends object = {},
	statics = {},
	abstractMethods extends object = {},
	abstractProps extends object = {}
> = statics &
	(new (...args: params) => Trait<abstractMethods, abstractProps> & instance)

type CompositionState = {
	validated: unknown[]
	remaining: unknown[]
	params: List
	implemented: object
	abstractMethods: object
	abstractProps: object
	statics: object
}

export type compose<traits extends unknown[]> = composeRecurse<{
	validated: []
	remaining: traits
	params: []
	implemented: {}
	abstractMethods: {}
	abstractProps: {}
	statics: {}
}>

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

type composeRecurse<s extends CompositionState> =
	s["remaining"] extends readonly [
		TraitConstructor<
			infer params,
			infer instance,
			infer statics,
			infer abstractMethods,
			infer abstractProps
		>,
		...infer tail
	]
		? composeRecurse<{
				validated: [...s["validated"], s["remaining"][0]]
				remaining: tail
				params: intersectParameters<s["params"], params>
				implemented: intersectImplementations<
					s["implemented"],
					Omit<instance, keyof abstractMethods | keyof abstractProps>
				>
				abstractMethods: intersectImplementations<
					s["abstractMethods"],
					abstractMethods
				>
				abstractProps: intersectImplementations<
					s["abstractProps"],
					abstractProps
				>
				statics: intersectImplementations<s["statics"], statics>
		  }>
		: {} extends s["abstractMethods"] & s["abstractProps"]
		? s
		: override<
				s,
				{
					validated: [...s["validated"], s["abstractMethods"]]
				}
		  >

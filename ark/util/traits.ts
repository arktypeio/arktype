import type { array } from "./arrays.ts"
import { hasDomain } from "./domain.ts"
import { noSuggest } from "./errors.ts"
import type { conform, satisfy, show } from "./generics.ts"
import type { intersectParameters } from "./intersections.ts"
import { type Constructor, ancestorsOf } from "./objectKinds.ts"
import { NoopBase } from "./records.ts"

export type TraitImplementation = <
	traits extends TraitConstructor[],
	implementation extends implementationOf<s>,
	s extends CompositionState = composeTraits<
		[...traits, implementation],
		"implementation"
	>,
	cls extends TraitConstructor = TraitConstructor<
		s["params"],
		s["implemented"],
		s["statics"],
		s["abstractMethods"],
		s["abstractProps"],
		s["abstractStatics"]
	>
>(
	...args: [...traits, implementation & ThisType<InstanceType<cls>>]
) => cls

export type TraitComposition = <
	traits extends TraitConstructor[],
	s extends CompositionState = composeTraits<traits, "abstract">
>(
	...traits: conform<traits, s["validated"]>
) => TraitConstructor<
	s["params"],
	s["implemented"],
	s["statics"],
	s["abstractMethods"],
	s["abstractProps"],
	s["abstractStatics"]
>

// even though the value we attach will be identical, we use this so classes
// won't be treated as instanceof a Trait
const implementedTraits = noSuggest("implementedTraits")

export const hasTrait =
	(traitClass: Constructor) =>
	(o: unknown): boolean => {
		if (!hasDomain(o, "object")) return false

		if (
			implementedTraits in o.constructor &&
			(o.constructor[implementedTraits] as Function[]).includes(traitClass)
		)
			return true

		// emulate standard instanceof behavior
		return ancestorsOf(o).includes(traitClass)
	}

export type TraitDeclaration = {
	abstractMethods?: object
	abstractProps?: object
	abstractStatics?: object
	dynamicBase?: object
}

/** @ts-ignore required to extend NoopBase */
export abstract class Trait<
	d extends TraitDeclaration = {},
	// we have to enumerate these for TS to understand extending their intersection
	abstractMethods extends object = d["abstractMethods"] & {},
	abstractProps extends object = d["abstractProps"] & {},
	abstractStatics extends object = d["abstractStatics"] & {},
	dynamicBase extends object = d["dynamicBase"] & {}
> extends NoopBase<abstractMethods & abstractProps & dynamicBase> {
	declare abstractMethods: abstractMethods
	declare abstractProps: abstractProps
	declare abstractStatic: abstractStatics

	static get [Symbol.hasInstance](): (o: unknown) => boolean {
		return hasTrait(this)
	}

	traitsOf(): readonly TraitConstructor[] {
		return implementedTraits in this.constructor ?
				(this.constructor[implementedTraits] as TraitConstructor[])
			:	[]
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

export const compose: TraitComposition = ((...traits: TraitConstructor[]) => {
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
				if (!flatImplementedTraits.includes(innerTrait))
					flatImplementedTraits.push(innerTrait)
			}
		}
		if (!flatImplementedTraits.includes(trait))
			flatImplementedTraits.push(trait)
	}
	Object.defineProperty(base, implementedTraits, {
		value: flatImplementedTraits,
		enumerable: false
	})
	return base as never
}) as TraitComposition

export const implement: TraitImplementation = (...args) => {
	if (args[args.length - 1] instanceof Trait)
		return compose(...(args as any)) as never

	const implementation = args[args.length - 1]
	const base = compose(...(args.slice(0, -1) as any))
	// copy implementation last since it overrides traits
	Object.defineProperties(
		base.prototype,
		Object.getOwnPropertyDescriptors(implementation)
	)
	return base as never
}

export type TraitConstructor<
	params extends array = any[],
	instance extends object = {},
	statics = {},
	abstractMethods extends object = {},
	abstractProps extends object = {},
	abstractStatics extends object = {}
> = statics &
	(new (...args: params) => Trait<{
		abstractMethods: abstractMethods
		abstractProps: abstractProps
		abstractStatics: abstractStatics
	}> &
		instance)

type CompositionState = {
	validated: array
	remaining: array
	params: array
	kind: TraitCompositionKind
	implemented: object
	abstractMethods: object
	abstractProps: object
	abstractStatics: object
	statics: object
}

export type TraitCompositionKind = "abstract" | "implementation"

export type composeTraits<
	traits extends array,
	kind extends TraitCompositionKind
> = _compose<{
	validated: []
	remaining: traits
	kind: kind
	params: []
	implemented: {}
	abstractMethods: {}
	abstractProps: {}
	abstractStatics: {}
	statics: {}
}>

type intersectImplementations<l, r> = {
	[k in keyof l]: k extends keyof r ?
		l[k] extends (...args: infer lArgs) => infer lReturn ?
			r[k] extends (...args: infer rArgs) => infer rReturn ?
				// ensure function intersections aren't handled as overloads which leads to unsafe behavior
				(...args: intersectParameters<lArgs, rArgs>) => lReturn & rReturn
			:	l[k] & r[k]
		:	l[k] & r[k]
	:	l[k]
} & Omit<r, keyof l>

type _compose<s extends CompositionState> =
	s["remaining"] extends (
		readonly [
			TraitConstructor<
				infer params,
				infer instance,
				infer statics,
				infer abstractMethods,
				infer abstractProps,
				infer abstractStatics
			>,
			...infer tail
		]
	) ?
		_compose<{
			validated: [...s["validated"], s["remaining"][0]]
			remaining: tail
			kind: s["kind"]
			params: intersectParameters<s["params"], params>
			implemented: intersectImplementations<
				s["implemented"],
				Omit<instance, keyof abstractMethods | keyof abstractProps>
			>
			statics: intersectImplementations<
				s["statics"],
				Omit<statics, keyof abstractStatics>
			>
			abstractMethods: intersectImplementations<
				s["abstractMethods"],
				abstractMethods
			>
			abstractProps: intersectImplementations<s["abstractProps"], abstractProps>
			abstractStatics: intersectImplementations<
				s["abstractStatics"],
				abstractStatics
			>
		}>
	:	finalizeState<s>

type finalizeState<s extends CompositionState> = satisfy<
	CompositionState,
	{
		params: s["params"]
		validated: s["validated"]
		remaining: s["remaining"]
		kind: s["kind"]
		implemented: show<s["implemented"]>
		statics: show<Omit<s["statics"], keyof typeof Trait>>
		abstractMethods: show<Omit<s["abstractMethods"], keyof s["implemented"]>>
		abstractProps: show<Omit<s["abstractProps"], keyof s["implemented"]>>
		abstractStatics: show<Omit<s["abstractStatics"], keyof s["statics"]>>
	}
>

export type implementationOf<s extends CompositionState> =
	s["abstractMethods"] &
		({} extends s["abstractProps"] ? {}
		:	{
				construct: (...args: s["params"]) => s["abstractProps"]
			}) &
		({} extends s["abstractStatics"] ? {}
		:	{
				statics: s["abstractStatics"]
			})

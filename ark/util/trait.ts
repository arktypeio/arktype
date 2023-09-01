import type { EntryParseResult } from "arktype/internal/parser/shared.js"
import type { conform, evaluate, merge } from "./generics.js"
import type { intersectParameters } from "./intersections.js"
import { type AbstractableConstructor, prototypeKeysOf } from "./objectKinds.js"
import type { entryOf } from "./records.js"
import { DynamicBase, entriesOf, hasKey } from "./records.js"

// @ts-expect-error (otherwise can't dynamically add abstracted props)
export abstract class Trait<
	args extends readonly unknown[] = readonly unknown[],
	props extends {} = {},
	requires extends {} = {}
> extends DynamicBase<requires & props> {
	protected declare args: args

	constructor(args: args, props: props, requires: requires) {
		super({} as never)
		// throw new Error(`Traits cannot be constructed directly`)
		// super("unnecessary" as never)
	}
}

type selfOf<
	trait extends AbstractableConstructor<Trait>,
	implementation
> = InstanceType<trait> extends implementation
	? // maintain the original name if possible
	  InstanceType<trait>
	: merge<InstanceType<trait>, implementation>

export type TraitConstructor<
	trait extends AbstractableConstructor<Trait> = AbstractableConstructor<Trait>
> = <implementation extends partsOf<trait>["requires"]>(
	implementation: implementation & ThisType<selfOf<trait, implementation>>
) => (...args: partsOf<trait>["args"]) => selfOf<trait, implementation>

export const implement =
	<traits extends readonly AbstractableConstructor<Trait>[]>(
		...traits: traits
	): TraitConstructor<compose<traits>> =>
	(...implementation) => {
		const base = compose(...traits)
		const prototype = Object.defineProperties(
			base.prototype,
			Object.getOwnPropertyDescriptors(implementation[0])
		)
		return (...args) => {
			const result = Object.create(prototype, {
				args: {
					value: args
				}
			})
			const z = result.initialize() //?
			return Object.assign(result, result.initialize?.())
		}
	}

export const flattenPrototypeDescriptors = (value: unknown) => {
	const result: Record<string | symbol, PropertyDescriptor> = {}
	while (value !== Object.prototype && value !== null && value !== undefined) {
		const descriptors = Object.getOwnPropertyDescriptors(value)
		for (const k in descriptors) {
			if (!result[k]) {
				result[k] = descriptors[k]
			}
		}
		value = Object.getPrototypeOf(value)
	}
	return entriesOf(result)
}

export const compose = <
	traits extends readonly AbstractableConstructor<Trait>[]
>(
	...traits: traits
) => {
	const initializers: (() => {})[] = []
	const result = traits.reduce(
		(base, trait) => {
			for (const [k, descriptors] of flattenPrototypeDescriptors(
				trait.prototype
			)) {
				if (base.prototype[k] === undefined) {
					Object.defineProperty(base.prototype, k, descriptors)
				} else if (k === "initialize") {
					initializers.push(descriptors.value)
				} else if (k !== "constructor") {
					throw new Error(
						`Property '${String(k)}' cannot be redefined on trait ${trait.name}`
					)
				}
			}
			return base
		},
		class {} as { prototype: any }
	) as unknown as compose<traits>
	if (!initializers.length) {
		return result
	}
	Object.defineProperty(result.prototype, "initialize", {
		// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
		value() {
			return initializers.reduce((base, init) => Object.assign(base, init()), {
				fOOL: ""
			})
		}
	})
	return result
}

export type compose<traits extends readonly AbstractableConstructor<Trait>[]> =
	traits extends readonly [
		infer head extends AbstractableConstructor<Trait>,
		...infer tail
	]
		? // if it's only a single trait, return it directly to preserve nominal types, arg labels, etc.
		  tail["length"] extends 0
			? head
			: composeRecurse<tail, partsOf<head>>
		: typeof Trait<[]>

type TraitParts = {
	args: readonly unknown[]
	requires: {}
	self: {}
	props: {}
}

interface partsOf<trait extends AbstractableConstructor<Trait>> {
	args: ConstructorParameters<trait>[0]
	props: ConstructorParameters<trait>[1]
	requires: ConstructorParameters<trait>[2]
	self: Omit<InstanceType<trait>, keyof this["props"] | keyof this["requires"]>
}

// TODO: typesafe compose, will validate compatibility as it goes
type composeRecurse<
	traits extends readonly unknown[],
	parts extends TraitParts
> = traits extends readonly [
	infer head extends AbstractableConstructor<Trait>,
	...infer tail
]
	? composeRecurse<
			tail,
			{
				args: intersectParameters<parts["args"], partsOf<head>["args"]>
				requires: Omit<parts["requires"], keyof partsOf<head>["self"]> &
					partsOf<head>["requires"]
				self: parts["self"] & partsOf<head>["self"]
				props: parts["props"] & partsOf<head>["props"]
			}
	  >
	: abstract new (
			args: parts["args"],
			props: evaluate<parts["props"]>,
			requires: evaluate<parts["requires"]>
	  ) => InstanceType<
			typeof Trait<
				parts["args"],
				evaluate<parts["props"] & parts["self"]>,
				evaluate<parts["requires"]>
			>
	  >

export class Describable extends Trait<
	[rule: unknown, attributes?: { description?: string }],
	{ description: string },
	{
		writeDefaultDescription(): string
	}
> {
	protected initialize() {
		console.log(this.args[1]) //?

		return {
			description: this.args[1]?.description ?? this.writeDefaultDescription()
		}
	}
}

const based = compose(
	Describable,
	class extends Trait {
		writeDefaultDescription() {
			return "default foo" as const
		}
		other() {
			return "bar"
		}
	}
)

class DescribableFoo extends based {}

const describableFoo = implement(DescribableFoo)({})

// console.log(describableFoo(0, { description: "bar" }))

describableFoo(0).description //?

class Boundable<data> extends Trait<
	[rule: { limit?: number }],
	{ limit: number | undefined },
	{
		sizeOf: (data: data) => number
	}
> {
	protected initialize = () => ({
		limit: this.args[0].limit
	})

	check(data: data) {
		return this.limit === undefined || this.sizeOf(data) <= this.limit
	}
}

// const string = implement(
// 	Boundable<string>,
// 	Describable
// )({
// 	sizeOf: (data) => data.length,
// 	writeDefaultDescription: () => "a string"
// })

// const shortString = string({ limit: 5 }, { description: "a short string" })

import type { evaluate } from "./generics.js"

export type AbstractTraitConstructor<
	input = never,
	implementation extends object = {},
	base extends object = never
> = (base: base) => TraitConstructor<input, evaluate<implementation & base>>

export type TraitConstructor<input = never, output extends object = {}> = (
	input: input
) => Trait<input, output>

export type Trait<input = never, output extends object = {}> = evaluate<
	{ readonly input: input } & output
>

export const trait =
	<input, implementation extends object, base extends object = {}>(
		implementation: implementation &
			ThisType<Trait<input, implementation & base>>
	): AbstractTraitConstructor<input, implementation, base> =>
	(base) =>
	(input) =>
		Object.assign(base, implementation, { input }) as never

const d2 = trait<
	{ description?: string },
	{ description: string },
	{ writeDefaultDescription: () => string }
>({
	get description() {
		return this.input.description ?? this.writeDefaultDescription()
	}
})

const describable =
	(base: { writeDefaultDescription: () => string }) =>
	(def: { description?: string }) => ({
		description: def.description ?? base.writeDefaultDescription()
	})

type Bound = {
	kind: "min" | "max"
	limit: number
}

const boundable =
	<data>(base: { sizeOf(data: data): number }) =>
	(def: { bounds?: Bound[] }) => ({
		checkBounds: (data: data) =>
			!def.bounds ||
			def.bounds.every((bound) =>
				bound.kind === "max"
					? base.sizeOf(data) < bound.limit
					: base.sizeOf(data) > bound.limit
			)
	})

const boundedDescribed = compose(
	describable,
	boundable
)({
	writeDefaultDescription: () => "default description",
	sizeOf: (data: number) => data + 1,
	isComposable: true
})

const result = boundedDescribed({ description: "something" }) //?

result.sizeOf(5) //? 6

result.description //? "something"

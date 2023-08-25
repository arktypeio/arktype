import type { evaluate } from "./generics.js"

export const trait = <input, implementation, abstract = {}>(
	implementation: implementation &
		ThisType<{ readonly input: input } & abstract>
) => {}

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

import type { conform, evaluate } from "./generics.js"
import type { Dict } from "./records.js"

type Trait<
	base extends Dict = never,
	args extends readonly any[] = readonly any[],
	adds extends Dict = Dict
> = (abstract: base) => (...args: args) => adds

type composeTraits<
	traits extends readonly unknown[],
	result extends Trait = Trait<{}, [], {}>
> = traits extends [infer head extends Trait, ...infer tail]
	? composeTraits<tail, intersectTraits<result, head>>
	: result

type intersectTraits<l extends Trait, r extends Trait> = [l, r] extends [
	Trait<infer lAbs, infer lArgs, infer lAdds>,
	Trait<infer rAbs, infer rArgs, infer rAdds>
]
	? Trait<
			evaluate<lAbs & rAbs>,
			intersectArgs<lArgs, rArgs>,
			evaluate<lAdds & rAdds>
	  >
	: never

type intersectArgs<
	l extends readonly unknown[],
	r extends readonly unknown[]
> = l extends readonly [infer lHead, ...infer lTail]
	? r extends readonly [infer rHead, ...infer rTail]
		? readonly [evaluate<lHead & rHead>, ...intersectArgs<lTail, rTail>]
		: l
	: r

type baseOf<trait extends Trait> = trait extends Trait<infer base>
	? base
	: never

type argsOf<trait extends Trait> = trait extends Trait<any, infer args>
	? args
	: never

type addsOf<trait extends Trait> = trait extends Trait<any, any, infer adds>
	? adds
	: never

const compose =
	<traits extends readonly Trait[]>(...traits: traits) =>
	<implementation extends baseOf<composeTraits<traits>>>(
		implementation: implementation
	) =>
	(...args: argsOf<composeTraits<traits>>) =>
		traits.reduce(
			(base, trait) => Object.assign(base, trait(base as never)(...args)),
			implementation as evaluate<implementation & addsOf<composeTraits<traits>>>
		)

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

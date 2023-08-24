import type { evaluate } from "./generics.js"
import type { Dict } from "./records.js"

type Trait<
	base extends Dict = never,
	args extends readonly any[] = readonly any[],
	adds extends Dict = Dict
> = (abstract: base) => (...args: args) => adds

const describable =
	(abstract: { writeDefaultDescription: () => string }) =>
	(def: { description?: string }) => ({
		description: def.description ?? abstract.writeDefaultDescription()
	})

type Bound = {
	kind: "min" | "max"
	limit: number
}

const boundable =
	<data>(abstract: { sizeOf(data: data): number }) =>
	(def: { bounds?: Bound[] }) => ({
		checkBounds: (data: data) => {
			if (!def.bounds) {
				return true
			}
			const size = abstract.sizeOf(data)
			return def.bounds.every((bound) =>
				bound.kind === "max" ? size < bound.limit : size > bound.limit
			)
		}
	})

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

const compose = <traits extends readonly Trait[]>(...traits: traits) =>
	({}) as composeTraits<traits>

const z = compose(describable, boundable)

const numericBounds = boundable({ sizeOf: (data: number) => data })

const bounded = numericBounds({ bounds: [{ kind: "min", limit: 1 }] })

const f = bounded.checkBounds(2) //?

import type { andPreserveUnknown } from "./generics.js"

export type intersectParameters<
	l extends readonly unknown[],
	r extends readonly unknown[],
	prefix extends readonly unknown[] = []
> = [parseNextParam<l>, parseNextParam<r>] extends [
	infer lState extends ParameterParseResult,
	infer rState extends ParameterParseResult
]
	? false extends lState["done"] | rState["done"]
		? // while either array still has fixed elements remaining, continue intersecting heads
		  intersectParameters<
				lState["tail"],
				rState["tail"],
				[
					...prefix,
					// the intersection is optional only if both elements are optional
					...(lState["optional"] | rState["optional"] extends true
						? [andPreserveUnknown<lState["head"], rState["head"]>?]
						: [andPreserveUnknown<lState["head"], rState["head"]>])
				]
		  >
		: // once both arrays have reached their fixed end or a variadic element, return the final result
		  [
				...prefix,
				...(lState["tail"] extends readonly []
					? rState["tail"] extends readonly []
						? []
						: // if done and non-empty, we've reached a variadic element
						  // (or it's just a normal array, since number[] === [...number[]])
						  rState["tail"]
					: rState["tail"] extends readonly []
					? lState["tail"]
					: // if we've reached a variadic element in both arrays, intersect them
					  andPreserveUnknown<lState["head"], rState["head"]>[])
		  ]
	: never

type ParameterParseResult = {
	head: unknown
	optional: boolean
	tail: readonly unknown[]
	done: boolean
}

type parseNextParam<params extends readonly unknown[]> =
	params extends readonly []
		? {
				// Since a longer args array is assignable to a shorter one,
				// elements after the last are typed as unknown. For a normal
				// tuple (not parameters), this would be never.
				head: unknown
				optional: true
				tail: []
				done: true
		  }
		: params extends readonly [(infer head)?, ...infer tail]
		? [tail, params] extends [params, tail]
			? {
					head: head
					optional: true
					tail: tail
					done: true
			  }
			: {
					head: head
					// the parameter is required iff its type is the same as the
					// one we inferred from within (infer head)?, otherwise optional
					optional: params[0] extends head ? false : true
					tail: tail
					done: false
			  }
		: never

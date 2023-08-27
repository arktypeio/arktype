export type intersectParameters<
	l extends readonly unknown[],
	r extends readonly unknown[],
	result extends readonly unknown[] = []
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
					...result,
					// the intersection is optional only if both elements are
					...(lState["optional"] | rState["optional"] extends true
						? [(lState["head"] & rState["head"])?]
						: [lState["head"] & rState["head"]])
				]
		  >
		: // once both arrays have reached their fixed end or a variadic element, return the final result
		  [
				...result,
				// if the state is done and non-optional, we've reached the end of a non-variadic tuple
				...(lState["optional"] extends false
					? rState["optional"] extends false
						? []
						: // if done and non-optional, we've reached a variadic element
						  // (or it's just a normal array, since number[] === [...number[]])
						  rState["tail"]
					: rState["optional"] extends false
					? lState["tail"]
					: // if we've reached a variadic element in both arrays, intersect them
					  (lState["head"] & rState["head"])[])
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
				optional: false
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
					optional: params[0] extends head ? false : true
					tail: tail
					done: false
			  }
		: never

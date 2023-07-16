import type { snapshot } from "@arktype/util"

export type rootAssertions<
	t,
	allowTypeAssertions extends boolean
> = valueAssertions<t, allowTypeAssertions> & TypeAssertionsRoot

export type valueAssertions<
	t,
	allowTypeAssertions extends boolean
> = comparableValueAssertion<t, allowTypeAssertions> &
	(t extends () => unknown ? functionAssertions<allowTypeAssertions> : {})

export type nextAssertions<allowTypeAssertions extends boolean> =
	allowTypeAssertions extends true ? TypeAssertionsRoot : {}

export type inferredAssertions<
	argsType extends [value: any, ...rest: any[]],
	allowTypeAssertions extends boolean,
	chained = argsType[0]
> = rootAssertions<chained, allowTypeAssertions> &
	(<Args extends argsType | [] = []>(
		...args: Args
	) => nextAssertions<allowTypeAssertions>)

export type ChainContext = {
	allowRegex?: boolean
	defaultExpected?: unknown
}

export type functionAssertions<AllowTypeAssertions extends boolean> = {
	throws: inferredAssertions<
		[message: string | RegExp],
		AllowTypeAssertions,
		string
	>
} & (AllowTypeAssertions extends true
	? {
			throwsAndHasTypeError: (message: string | RegExp) => undefined
	  }
	: {})

export type valueFromTypeAssertion<
	Expected,
	Chained = Expected
> = inferredAssertions<[expected: Expected], false, Chained>

export type comparableValueAssertion<T, AllowTypeAssertions extends boolean> = {
	is: (value: T) => nextAssertions<AllowTypeAssertions>
	snap: (value?: snapshot<T>) => nextAssertions<AllowTypeAssertions>
	snapToFile: (
		args: ExternalSnapshotArgs
	) => nextAssertions<AllowTypeAssertions>
	equals: (value: T) => nextAssertions<AllowTypeAssertions>
	// This can be used to assert values without type constraints
	unknown: Omit<
		comparableValueAssertion<unknown, AllowTypeAssertions>,
		"unknown"
	>
	typedValue: (expected: T) => undefined
}

export type TypeAssertionsRoot = {
	types: TypeAssertionProps
	typed: unknown
}

export type TypeAssertionProps = {
	toString: valueFromTypeAssertion<string>
	errors: valueFromTypeAssertion<string | RegExp, string>
}

export type ExternalSnapshotArgs = {
	id: string
	path?: string
}

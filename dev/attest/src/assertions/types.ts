import type { snapshot } from "arktype/internal/utils/serialize.js"

export type RootAssertions<
    T,
    AllowTypeAssertions extends boolean
> = ValueAssertions<T, AllowTypeAssertions> & TypeAssertionsRoot

export type ValueAssertions<
    T,
    AllowTypeAssertions extends boolean
> = ComparableValueAssertion<T, AllowTypeAssertions> &
    (T extends () => unknown ? FunctionAssertions<AllowTypeAssertions> : {})

export type NextAssertions<AllowTypeAssertions extends boolean> =
    AllowTypeAssertions extends true ? TypeAssertionsRoot : {}

export type InferredAssertions<
    ArgsType extends [value: any, ...rest: any[]],
    AllowTypeAssertions extends boolean,
    Chained = ArgsType[0]
> = RootAssertions<Chained, AllowTypeAssertions> &
    (<Args extends ArgsType | [] = []>(
        ...args: Args
    ) => NextAssertions<AllowTypeAssertions>)

export type ChainContext = {
    allowRegex?: boolean
    defaultExpected?: unknown
}

export type FunctionAssertions<AllowTypeAssertions extends boolean> = {
    throws: InferredAssertions<
        [message: string | RegExp],
        AllowTypeAssertions,
        string
    >
} & (AllowTypeAssertions extends true
    ? {
          throwsAndHasTypeError: (message: string | RegExp) => undefined
      }
    : {})

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = InferredAssertions<[expected: Expected], false, Chained>

export type TypeAssertionsRoot = {
    type: TypeAssertionProps
    typed: unknown
}

export type TypeAssertionProps = {
    toString: ValueFromTypeAssertion<string>
    errors: ValueFromTypeAssertion<string | RegExp, string>
}

export type ComparableValueAssertion<T, AllowTypeAssertions extends boolean> = {
    is: (value: T) => NextAssertions<AllowTypeAssertions>
    snap: (value?: snapshot<T>) => NextAssertions<AllowTypeAssertions>
    snapToFile: (
        args: ExternalSnapshotArgs
    ) => NextAssertions<AllowTypeAssertions>
    equals: (value: T) => NextAssertions<AllowTypeAssertions>
    // This can be used to assert values without type constraints
    unknown: Omit<
        ComparableValueAssertion<unknown, AllowTypeAssertions>,
        "unknown"
    >
    typedValue: (expected: T) => undefined
}

export type ExternalSnapshotArgs = {
    id: string
    path?: string
}

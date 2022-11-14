import type { isTopType, narrow } from "../../../../src/utils/generics.js"
import type { Serialized } from "../common.js"

export type NextAssertions<AllowTypeAssertions extends boolean> =
    AllowTypeAssertions extends true ? TypeAssertionsRoot : {}

export type RootAssertions<
    T,
    AllowTypeAssertions extends boolean
> = (isTopType<T> extends true
    ? AnyValueAssertion<T, AllowTypeAssertions>
    : TypedValueAssertions<T, AllowTypeAssertions>) &
    TypeAssertionsRoot

export type InferredAssertions<
    ArgsType extends [value: any, ...rest: any[]],
    AllowTypeAssertions extends boolean,
    Chained = ArgsType[0],
    IsReturn extends boolean = false,
    ImmediateAssertions = RootAssertions<Chained, AllowTypeAssertions> &
        (IsReturn extends true ? NextAssertions<AllowTypeAssertions> : {})
> = (<Args extends ArgsType | [] = []>(
    ...args: Args
) => NextAssertions<AllowTypeAssertions>) &
    ImmediateAssertions

export type ChainContext = {
    isReturn?: boolean
    allowRegex?: boolean
    defaultExpected?: unknown
}

export type AnyValueAssertion<
    T,
    AllowTypeAssertions extends boolean
> = FunctionAssertions<AllowTypeAssertions> &
    ComparableValueAssertion<T, AllowTypeAssertions>

export type TypedValueAssertions<
    T,
    AllowTypeAssertions extends boolean
> = T extends () => unknown
    ? FunctionAssertions<AllowTypeAssertions>
    : ComparableValueAssertion<T, AllowTypeAssertions>

export type FunctionAssertions<AllowTypeAssertions extends boolean> = {
    throws: InferredAssertions<
        [message: string | RegExp],
        AllowTypeAssertions,
        string,
        false
    >
} & (AllowTypeAssertions extends true
    ? {
          throwsAndHasTypeError: (message: string | RegExp) => undefined
      }
    : {})

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = InferredAssertions<[expected: Expected], false, Chained, false>

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
    snap: (value?: Serialized<T>) => NextAssertions<AllowTypeAssertions>
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
    narrowedValue: <Expected extends T>(expected: narrow<Expected>) => undefined
}

export type ExternalSnapshotArgs = {
    id: string
    path?: string
}

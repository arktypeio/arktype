import { SourcePosition, withCallPosition } from "@re-/node"
import { ListPossibleTypes, WithDefaults, withDefaults } from "@re-/tools"
import { typeAssertions, TypeAssertions } from "./type"
import { valueAssertions, ValueAssertion } from "./value"

export type AssertionResult<
    T,
    Opts extends AssertionOptions = {},
    Config extends AssertionConfig = WithDefaults<
        AssertionOptions,
        Opts,
        { allowTypeAssertions: true; returnsCount: 0 }
    >
> = ValueAssertion<ListPossibleTypes<T>, Config> &
    (Config["allowTypeAssertions"] extends true ? TypeAssertions : {})

export type Assertion = <T>(value: T) => AssertionResult<T>

export type AssertionContext = <T, ProvidedOptions extends AssertionOptions>(
    position: SourcePosition,
    value: T,
    opts?: ProvidedOptions
) => AssertionResult<T, ProvidedOptions>

export type AssertionOptions = {
    allowTypeAssertions?: boolean
    returnsCount?: number
}

export type AssertionConfig = Required<AssertionOptions>

type AssertionResultOfType<T> = AssertionResult<
    T,
    { allowTypeAssertions: true }
>

type AssertionResultKey =
    | keyof AssertionResultOfType<() => {}>
    | keyof AssertionResultOfType<"">
    | keyof AssertionResultOfType<{}>

type PartialAssertionResult = { [K in AssertionResultKey]?: any }

export const assertionContext: AssertionContext = (
    position: SourcePosition,
    value: unknown,
    opts?: AssertionOptions
) => {
    const config = withDefaults<AssertionOptions>({
        allowTypeAssertions: true,
        returnsCount: 0
    })(opts)
    let assertionContext: PartialAssertionResult = valueAssertions(
        position,
        value,
        config
    )
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext as any
}

// @ts-ignore
export const assert = withCallPosition(assertionContext, {
    // TS uses "/" as their path seperator, even on Windows
    formatPath: { seperator: "/" }
}) as any as Assertion

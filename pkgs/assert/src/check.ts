import {
    SourcePosition,
    SourceRange,
    withCallPosition,
    withCallRange
} from "@re-do/node"
import {
    WithDefaults,
    withDefaults,
    Func,
    MergeAll,
    NonRecursible,
    NonObject
} from "@re-do/utils"
import { typeAssertions, TypeAssertions } from "./type"
import { valueAssertions, ValueAssertion } from "./value"

export type AssertionResult<
    T,
    Opts extends AssertionOptions = {},
    Config extends AssertionConfig = WithDefaults<
        AssertionOptions,
        Opts,
        { allowTypeAssertions: true }
    >
> = ValueAssertion<T, Config> &
    (Config["allowTypeAssertions"] extends true
        ? TypeAssertions & {
              hasTypedValue: (expected: unknown) => undefined
          }
        : {})

export type Assertion = <T>(value: T) => AssertionResult<T>

export type AssertionContext = <T, ProvidedOptions extends AssertionOptions>(
    position: SourcePosition,
    value: T,
    opts?: ProvidedOptions
) => AssertionResult<T, ProvidedOptions>

export type AssertionOptions = {
    allowTypeAssertions?: boolean
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
        allowTypeAssertions: true
    })(opts)
    let assertionContext: PartialAssertionResult = valueAssertions(
        position,
        value,
        config
    )
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position), assertionContext)
    }
    return assertionContext as any
}

export const assert = withCallPosition(assertionContext) as any as Assertion

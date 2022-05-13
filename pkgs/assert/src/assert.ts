// import { SourcePosition, withCallPosition } from "@re-/node"
import { ListPossibleTypes, Merge } from "@re-/tools"
import { typeAssertions, TypeAssertions } from "./type/index.ts"
import { valueAssertions, ValueAssertion } from "./value/index.ts"
import { SourcePosition } from "./positions.ts"
import getCurrentLine from "https://unpkg.com/get-current-line@6.6.0/edition-deno/index.ts"

export type AssertionResult<
    T,
    Opts extends AssertionOptions = {},
    Config = Merge<{ allowTypeAssertions: true; returnsCount: 0 }, Opts>
    // @ts-ignore
> = ValueAssertion<ListPossibleTypes<T>, Config> &
    // @ts-ignore
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

export const assert: Assertion = (value: unknown, opts?: AssertionOptions) => {
    const position = getCurrentLine({ method: "assert" })
    const config = {
        allowTypeAssertions: true,
        returnsCount: 0,
        ...opts
    }
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

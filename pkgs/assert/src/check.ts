import { SourceRange, withCallRange } from "@re-do/node"
import { Func, WithDefaults, withDefaults } from "@re-do/utils"
import {
    typeAssertions,
    TypeAssertions,
    TypeContext,
    typeContext,
    ValueFromTypeAssertion
} from "./type"
import {
    ChainableValueAssertion,
    RecursibleValueAssertion,
    valueAssertion,
    ValueAssertion
} from "./value"

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
              typedValue: ValueFromTypeAssertion<unknown>
          }
        : {})

export type Assertion = <T>(value: T) => AssertionResult<T>

export type AssertionContext = <T, ProvidedOptions extends AssertionOptions>(
    range: SourceRange,
    value: T,
    opts?: ProvidedOptions
) => AssertionResult<T, ProvidedOptions>

export type AssertionOptions = {
    allowTypeAssertions?: boolean
}

export type AssertionConfig = Required<AssertionOptions>

export const assertionContext: AssertionContext = (
    range: SourceRange,
    value: unknown,
    opts?: AssertionOptions
) => {
    const config = withDefaults<AssertionOptions>({
        allowTypeAssertions: true
    })(opts)
    return {
        type: typeAssertions(range),
        value: valueAssertion(range, value, config)
    } as any
}

export const assert = withCallRange(assertionContext, {
    allProp: {
        name: "has"
    }
}) as any as Assertion

const dofsh = 500

assert(dofsh).is(500)
assert(dofsh).typedValue // (500 as number)

assert({}).equals(500).typed as number
assert(() => () => ({})).returns.returns({})
assert(dofsh).typed as number
assert(dofsh).type.errors([])
assert(dofsh).type.toString("number")
assert(dofsh).type.toString.snap()
assert(dofsh).type.toString("")

import { fileURLToPath } from "node:url"
import { caller } from "@re-/node"
import { ListPossibleTypes } from "@re-/tools"
import { getReAssertConfig, ReAssertConfig } from "./common.js"
import { typeAssertions, TypeAssertions } from "./type/index.js"
import { ValueAssertion, valueAssertions } from "./value/index.js"

export type AvailableAssertions<T> = ValueAssertion<
    ListPossibleTypes<T>,
    true
> &
    TypeAssertions

export type AssertionResult<T> = AvailableAssertions<T>

export type Assertion = <T>(value: T) => AssertionResult<T>

export type AssertionContext = {
    allowTypeAssertions: boolean
    returnsCount: number
    originalAssertedValue: unknown
    args: unknown[]
    config: ReAssertConfig
}

// @ts-ignore
export const assert: Assertion = (
    value: unknown,
    internalConfigHooks?: Partial<AssertionContext>
) => {
    const position = caller()
    if (!/\.(c|m)?tsx?$/.test(position.file)) {
        throw new Error(
            `Assert cannot be called from outside a TypeScript source file (got '${position.file}'). `
        )
    }
    if (position.file.startsWith("file:///")) {
        position.file = fileURLToPath(position.file)
    }
    const config: AssertionContext = {
        allowTypeAssertions: true,
        returnsCount: 0,
        originalAssertedValue: value,
        args: [],
        config: { ...getReAssertConfig(), ...internalConfigHooks }
    }
    const assertionContext = valueAssertions(position, value, config)
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext
}

import { fileURLToPath } from "node:url"
import { caller, fileName } from "@re-/node"
import { ListPossibleTypes } from "@re-/tools"
import { getReAssertConfig, ReAssertConfig } from "./common.js"
import { typeAssertions, TypeAssertions } from "./type/index.js"
import { ValueAssertion, valueAssertions } from "./value/index.js"

export type AssertionResult<
    T,
    AllowTypeAssertions extends boolean
> = ValueAssertion<ListPossibleTypes<T>, AllowTypeAssertions> &
    (AllowTypeAssertions extends true ? TypeAssertions : {})

export type Assertion = <T>(value: T) => AssertionResult<T, true>

export type AssertionContext = {
    allowTypeAssertions: boolean
    returnsCount: number
    config: ReAssertConfig
}

export const getAssertFilePath = () => fileName()

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
        config: { ...getReAssertConfig(), ...internalConfigHooks }
    }
    const assertionContext = valueAssertions(position, value, config)
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext as any
}

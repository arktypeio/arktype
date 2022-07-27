import { fileURLToPath } from "node:url"
import { caller } from "@re-/node"
import {
    fixVitestPos,
    getReAssertConfig,
    isVitest,
    ReAssertConfig
} from "./common.js"
import { TypeAssertions } from "./type/index.js"
import { ValueAssertion, valueAssertions } from "./value/index.js"

export type AvailableAssertions<T> = ValueAssertion<T, true> & TypeAssertions

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
    let position = caller()
    if (isVitest()) {
        position = fixVitestPos(position)
    }
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
    return Object.assign(
        new TypeAssertions(position, config),
        valueAssertions(position, value, config)
    )
}

import { fileURLToPath } from "node:url"
import { caller } from "@re-/node"
import { ValueAssertion, valueAssertions } from "./assertions/index.js"
import {
    fixVitestPos,
    getReAssertConfig,
    isVitest,
    ReAssertConfig,
    SourcePosition
} from "./common.js"
import { TypeAssertions } from "./type/index.js"

export type AvailableAssertions<T> = ValueAssertion<T, true> & TypeAssertions

export type AssertionResult<T> = AvailableAssertions<T>

export type Assertion = <T>(value: T) => AssertionResult<T>

export type AssertionContext = {
    allowTypeAssertions: boolean
    originalAssertedValue: unknown
    assertedFnArgs: unknown[]
    cfg: ReAssertConfig
    isReturn: boolean
    allowRegex: boolean
    position: SourcePosition
    actualValueThunk: () => unknown
    defaultExpected?: unknown
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
    const ctx: AssertionContext = {
        allowTypeAssertions: true,
        isReturn: false,
        allowRegex: false,
        originalAssertedValue: value,
        assertedFnArgs: [],
        position,
        actualValueThunk: () => value,
        cfg: { ...getReAssertConfig(), ...internalConfigHooks }
    }
    return Object.assign(
        new TypeAssertions(ctx),
        valueAssertions(position, value, ctx)
    )
}

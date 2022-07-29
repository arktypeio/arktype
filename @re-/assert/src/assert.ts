import { fileURLToPath } from "node:url"
import { caller } from "@re-/node"
import { Assertions, ValueAssertion } from "./assertions/index.js"
import {
    fixVitestPos,
    getReAssertConfig,
    isVitest,
    ReAssertConfig,
    SourcePosition
} from "./common.js"

export type AvailableAssertions<T> = ValueAssertion<T, true>

export type AssertionResult<T> = AvailableAssertions<T>

export type AssertFn = <T>(value: T) => AssertionResult<T>

export type AssertionContext = {
    actual: unknown
    originalAssertedValue: unknown
    assertedFnArgs: unknown[]
    cfg: ReAssertConfig
    isReturn: boolean
    allowRegex: boolean
    position: SourcePosition
    defaultExpected?: unknown
}

// @ts-ignore
export const assert: AssertFn = (
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
        actual: value,
        isReturn: false,
        allowRegex: false,
        originalAssertedValue: value,
        assertedFnArgs: [],
        position,
        cfg: { ...getReAssertConfig(), ...internalConfigHooks }
    }
    return new Assertions(ctx)
}

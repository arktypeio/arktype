import { fileURLToPath } from "node:url"
import { caller, getCallStack } from "@arktype/node"
import type { ValueAssertion } from "./assertions/index.js"
import { Assertions } from "./assertions/index.js"
import type { AtTestConfig, SourcePosition } from "./common.js"
import { getAtTestConfig } from "./common.js"
import { fixVitestPos, isVitest } from "./vitest.js"

export type AvailableAssertions<T> = ValueAssertion<T, true>

export type AssertionResult<T> = AvailableAssertions<T>

export type AssertFn = <T>(value: T) => AssertionResult<T>

export type AssertionContext = {
    actual: unknown
    originalAssertedValue: unknown
    assertedFnArgs: unknown[]
    cfg: AtTestConfig
    isReturn: boolean
    allowRegex: boolean
    position: SourcePosition
    defaultExpected?: unknown
    assertionStack: string
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
        cfg: { ...getAtTestConfig(), ...internalConfigHooks },
        assertionStack: getCallStack({ offset: 1 }).join("\n")
    }
    return new Assertions(ctx)
}

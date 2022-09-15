import { fileURLToPath } from "node:url"
import { caller, getCallStack } from "@re-/node"
import { Assertions, ValueAssertion } from "./assertions/index.js"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "./common.js"
import { fixVitestPos, isVitest } from "./vitest.js"

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
        cfg: { ...getReAssertConfig(), ...internalConfigHooks },
        assertionStack: getCallStack({ offset: 1 }).join("\n")
    }
    return new Assertions(ctx)
}

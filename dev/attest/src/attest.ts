import { fileURLToPath } from "node:url"
import { Assertions } from "./assertions/assertions.js"
import type {
    rootAssertions,
    TypeAssertionsRoot,
    valueAssertions
} from "./assertions/types.js"
import { caller, getCallStack } from "./caller.js"
import type { AttestConfig } from "./config.js"
import { getConfig } from "./config.js"

import type { SourcePosition } from "./utils.js"

export type AttestFn = <T>(
    value: T
) => [T] extends [never]
    ? rootAssertions<unknown, true>
    : rootAssertions<T, true>

export type AssertionContext = {
    actual: unknown
    originalAssertedValue: unknown
    cfg: AttestConfig
    isReturn: boolean
    allowRegex: boolean
    position: SourcePosition
    defaultExpected?: unknown
    assertionStack: string
}

export const attest = ((
    value: unknown,
    internalConfigHooks?: Partial<AssertionContext>
) => {
    const position = caller()
    if (position.file.startsWith("file:///")) {
        position.file = fileURLToPath(position.file)
    }
    const ctx: AssertionContext = {
        actual: value,
        isReturn: false,
        allowRegex: false,
        originalAssertedValue: value,
        position,
        cfg: { ...getConfig(), ...internalConfigHooks },
        assertionStack: getCallStack({ offset: 1 }).join("\n")
    }
    return new Assertions(ctx)
}) as AttestFn

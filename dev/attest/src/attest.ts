import { fileURLToPath } from "node:url"
import { caller, getCallStack } from "../../runtime/main.ts"
import { Assertions } from "./assertions/assertions.ts"
import type { RootAssertions } from "./assertions/types.ts"
import type { AttestConfig } from "./config.ts"
import { getAttestConfig } from "./config.ts"
import type { SourcePosition } from "./utils.ts"

export type AssertFn = <T>(value: T) => RootAssertions<T, true>

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
        cfg: { ...getAttestConfig(), ...internalConfigHooks },
        assertionStack: getCallStack({ offset: 1 }).join("\n")
    }
    return new Assertions(ctx)
}) as AssertFn

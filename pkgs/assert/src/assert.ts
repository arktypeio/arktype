import { ListPossibleTypes } from "@re-/tools"
import { getCurrentLine, fromFileUrl } from "./deps.ts"
import { typeAssertions, TypeAssertions } from "./type/index.ts"
import { valueAssertions, ValueAssertion } from "./value/index.ts"
import { getReAssertConfig, ReAssertConfig } from "./common.ts"

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

export const getAssertFilePath = () => fromFileUrl(import.meta.url)

export const assert: Assertion = (
    value: unknown,
    internalConfigHooks?: Partial<AssertionContext>
) => {
    const position = getCurrentLine({ method: "assert" })
    if (!position.file.match(/\.(c|m)?tsx?$/)) {
        throw new Error(
            `Assert cannot be called from outside a TypeScript source file (got '${position.file}'). `
        )
    }
    if (position.file.startsWith("file:///")) {
        position.file = fromFileUrl(position.file)
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

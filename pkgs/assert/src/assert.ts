import { ListPossibleTypes, Merge } from "@re-/tools"
import { fromFileUrl } from "deno/std/path/mod.ts"
import { typeAssertions, TypeAssertions, getTsProject } from "src/type/index.ts"
import { valueAssertions, ValueAssertion } from "src/value/index.ts"
import { Project } from "ts-morph"
import getCurrentLine from "get-current-line"
import { SourcePosition } from "src/common.ts"

export type AssertionResult<
    T,
    AllowTypeAssertions extends boolean
> = ValueAssertion<ListPossibleTypes<T>, AllowTypeAssertions> &
    (AllowTypeAssertions extends true ? TypeAssertions : {})

export type Assertion = <T>(value: T) => AssertionResult<T, true>

export type AssertionContext = <T, AllowTypeAssertions extends boolean>(
    position: SourcePosition,
    value: T
) => AssertionResult<T, AllowTypeAssertions>

export type AssertionConfig = {
    allowTypeAssertions: boolean
    returnsCount: number
    project: Project
}

export const assert: Assertion = (value: unknown) => {
    const position = getCurrentLine({ method: "assert" })
    const project = getTsProject()
    if (position.file.startsWith("file:///")) {
        position.file = fromFileUrl(position.file)
    }
    const config = {
        allowTypeAssertions: true,
        returnsCount: 0,
        project
    }
    const assertionContext = valueAssertions(position, value, config)
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext as any
}

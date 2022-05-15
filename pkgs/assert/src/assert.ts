// import { SourcePosition, withCallPosition } from "@re-/node"
import { ListPossibleTypes, Merge } from "@re-/tools"
import { fromFileUrl } from "@deno/path"
import { typeAssertions, TypeAssertions, getTsProject } from "./type/index.js"
import { valueAssertions, ValueAssertion } from "./value/index.js"
import { SourcePosition } from "positions"
import { Project } from "ts-morph"
import getCurrentLine from "https://unpkg.com/get-current-line@6.6.0/edition-deno/index.js"

export type AssertionResult<
    T,
    AllowTypeAssertions extends boolean,
    Config = {}
> = ValueAssertion<ListPossibleTypes<T>, Config> &
    AllowTypeAssertions extends true
    ? TypeAssertions
    : {}

export type Assertion = <T>(value: T) => AssertionResult<T, true>

export type AssertionContext = <T, Config extends AssertionConfig>(
    position: SourcePosition,
    value: T
) => AssertionResult<T, Config>

export type AssertionConfig = {
    allowTypeAssertions: boolean
    returnsCount: number
    project: Project
}

// type AssertionResultOfType<T> = AssertionResult<
//     T,
//     { allowTypeAssertions: true }
// >

// type AssertionResultKey =
//     | keyof AssertionResultOfType<() => {}>
//     | keyof AssertionResultOfType<"">
//     | keyof AssertionResultOfType<{}>

// type PartialAssertionResult = { [K in AssertionResultKey]?: any }

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
    let assertionContext: PartialAssertionResult = valueAssertions(
        position,
        value,
        config
    )
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext as any
}

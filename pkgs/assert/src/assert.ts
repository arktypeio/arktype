import { ListPossibleTypes, Merge } from "@re-/tools"
import { fromFileUrl } from "deno/std/path/mod.ts"
import {
    typeAssertions,
    TypeAssertions,
    getTsProject,
    getAssertionCachePath
} from "src/type/index.ts"
import { valueAssertions, ValueAssertion } from "src/value/index.ts"
import { Project } from "ts-morph"
import getCurrentLine from "get-current-line"
import { readJsonSync, SourcePosition } from "src/common.ts"

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
    updateSnapshots: boolean
    project: Project | undefined
    cachePath: string | undefined
}

export const assert: Assertion = (
    value: unknown,
    internalConfigHooks?: Partial<AssertionConfig>
) => {
    const position = getCurrentLine({ method: "assert" })
    if (position.file.startsWith("file:///")) {
        position.file = fromFileUrl(position.file)
    }
    const updateSnapshots = !!(
        internalConfigHooks?.updateSnapshots ||
        Deno.args.find((arg) => arg === "--update" || arg === "-u")
    )
    const precached = !!readJsonSync("re.json")?.assert?.precached
    const config: AssertionConfig = {
        allowTypeAssertions: true,
        returnsCount: 0,
        updateSnapshots,
        project: precached ? undefined : getTsProject(),
        cachePath: precached ? getAssertionCachePath(position.file) : undefined
    }
    const assertionContext = valueAssertions(position, value, config)
    if (config.allowTypeAssertions) {
        return Object.assign(typeAssertions(position, config), assertionContext)
    }
    return assertionContext as any
}

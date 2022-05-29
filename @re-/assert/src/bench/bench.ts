import { caller } from "@re-/node"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "../common.js"
import { CallTimeAssertionName, getBenchCallAssertions } from "./call.js"
import { getBenchTypeAssertions } from "./type.js"

export interface BenchOptions {
    until?: {
        ms?: number
        count?: number
    }
}

export interface BenchContext {
    name: string
    options: BenchOptions
    config: ReAssertConfig
    position: SourcePosition
}

export type AssertionName = CallTimeAssertionName | "type"

export interface BenchAssertionContext extends BenchContext {
    kind: AssertionName
}

export const bench = (
    name: string,
    fn: () => void,
    options: BenchOptions = {}
) => {
    const ctx: BenchContext = {
        name,
        options,
        config: getReAssertConfig(),
        position: caller()
    }
    return {
        ...getBenchCallAssertions(fn, ctx),
        ...getBenchTypeAssertions(caller(), ctx)
    }
}

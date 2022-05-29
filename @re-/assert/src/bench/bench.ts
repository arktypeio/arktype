import { caller } from "@re-/node"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "../common.js"
import { AssertionName, getBenchCallAssertions } from "./call.js"
import { getBenchTypeAssertions } from "./type.js"

export interface BaseBenchOptions {
    until?: {
        ms?: number
        count?: number
    }
}

export interface BenchOptions extends BaseBenchOptions {
    hooks?: {
        beforeCall?: () => void
        afterCall?: () => void
    }
}

export interface BenchContext {
    name: string
    options: BenchOptions
    config: ReAssertConfig
    position: SourcePosition
}

export interface BenchAssertionContext extends BenchContext {
    kind: AssertionName
}

export const bench = <Fn extends () => unknown>(
    name: string,
    fn: Fn,
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
        ...getBenchTypeAssertions(ctx)
    }
}

import { caller } from "@re-/node"
import {
    callableChainableNoOpProxy,
    getReAssertConfig,
    ReAssertConfig,
    SourcePosition
} from "../common.js"
import {
    AssertionName,
    BenchCallAssertions,
    getBenchCallAssertions
} from "./call.js"
import { BenchType, getBenchTypeAssertions } from "./type.js"

export interface UntilOptions {
    ms?: number
    count?: number
}

export interface BaseBenchOptions {
    until?: UntilOptions
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
    benchCallPosition: SourcePosition
    lastSnapCallPosition: SourcePosition | undefined
    fromType: boolean
}

export interface BenchAssertionContext extends BenchContext {
    kind: AssertionName
}

export type BenchAssertions = BenchType & BenchCallAssertions

export const bench = <Fn extends () => unknown>(
    name: string,
    fn: Fn,
    options: BenchOptions = {}
): BenchAssertions => {
    const ctx: BenchContext = {
        name,
        options,
        config: getReAssertConfig(),
        benchCallPosition: caller(),
        fromType: false,
        lastSnapCallPosition: undefined
    }
    if (ctx.config.matcher && !ctx.config.matcher.test(name)) {
        // If a matcher was provided via --only and it does not match, ignore all checks
        return callableChainableNoOpProxy
    }
    return {
        ...getBenchCallAssertions(fn, ctx),
        ...getBenchTypeAssertions(ctx)
    }
}

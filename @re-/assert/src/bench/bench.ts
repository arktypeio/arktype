import { caller } from "@re-/node"
import { chainableNoOpProxy } from "@re-/tools"
import type { ReAssertConfig, SourcePosition } from "../common.js"
import { getReAssertConfig } from "../common.js"
import type { BenchFormat } from "../writeSnapshot.js"
import type { TimeAssertionName } from "./call.js"
import { BenchAssertions } from "./call.js"
import type { BenchTypeAssertions } from "./type.js"
import { createBenchTypeAssertion } from "./type.js"

export type UntilOptions = {
    ms?: number
    count?: number
}

export type BaseBenchOptions = {
    until?: UntilOptions
}

export type BenchOptions = BaseBenchOptions & {
    hooks?: {
        beforeCall?: () => void
        afterCall?: () => void
    }
    benchFormat?: BenchFormat
}

export type InternalBenchOptions = BenchOptions & {
    fakeCallMs?: number | "count"
}

export type BenchContext = {
    name: string
    options: InternalBenchOptions
    cfg: ReAssertConfig
    benchCallPosition: SourcePosition
    lastSnapCallPosition: SourcePosition | undefined
    isAsync: boolean
}

export type BenchAssertionContext = BenchContext & {
    kind: TimeAssertionName | "type"
}

export type BenchableFunction = () => unknown | Promise<unknown>

export type InitialBenchAssertions<Fn extends BenchableFunction> =
    BenchAssertions<Fn> & BenchTypeAssertions

export const bench = <Fn extends BenchableFunction>(
    name: string,
    fn: Fn,
    options: BenchOptions = {}
): InitialBenchAssertions<Fn> => {
    const ctx: BenchContext = {
        name,
        options,
        cfg: getReAssertConfig(),
        benchCallPosition: caller(),
        lastSnapCallPosition: undefined,
        isAsync: fn.constructor.name === "AsyncFunction"
    }
    if (ctx.cfg.benchMatcher) {
        if (
            typeof ctx.cfg.benchMatcher === "string" &&
            !name.includes(ctx.cfg.benchMatcher)
        ) {
            return chainableNoOpProxy
        } else if (
            ctx.cfg.benchMatcher instanceof RegExp &&
            !ctx.cfg.benchMatcher.test(name)
        ) {
            return chainableNoOpProxy
        }
    }
    const assertions = new BenchAssertions(fn, ctx)
    Object.assign(assertions, createBenchTypeAssertion(ctx))
    return assertions as any
}

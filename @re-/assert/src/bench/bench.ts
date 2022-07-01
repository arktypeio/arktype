import { caller } from "@re-/node"
import { chainableNoOpProxy } from "@re-/tools"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "../common.js"
import { AssertionName, BenchAssertions } from "./call.js"
import { BenchTypeAssertions, createBenchTypeAssertions } from "./type.js"

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
    isTypeAssertion: boolean
    isAsync: boolean
}

export interface BenchAssertionContext extends BenchContext {
    kind: AssertionName
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
        config: getReAssertConfig(),
        benchCallPosition: caller(),
        isTypeAssertion: false,
        lastSnapCallPosition: undefined,
        isAsync: fn.constructor.name === "AsyncFunction"
    }
    if (ctx.config.matcher && !ctx.config.matcher.test(name)) {
        // If a matcher was provided via --only and it does not match, ignore all checks
        return chainableNoOpProxy
    }
    const assertions = new BenchAssertions(fn, ctx)
    Object.assign(assertions, createBenchTypeAssertions(ctx))
    return assertions as any
}

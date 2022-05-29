import { caller } from "@re-/node"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "../common.js"
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
        // If a matcher was provided via --only and it does not match,
        // return a noop that lets you arbitrarily chain properties.
        const noopProxy: any = new Proxy(() => noopProxy, {
            get: (target, prop) => {
                // This tries to chain arbitrary prop access and function calls, but technically could throw if
                // accessing prop from the function prototype, e.g. 'apply' (should not happen normally)
                if (prop in target) {
                    return (target as any)[prop]
                }
                return noopProxy
            }
        })
        return noopProxy
    }
    return {
        ...getBenchCallAssertions(fn, ctx),
        ...getBenchTypeAssertions(ctx)
    }
}

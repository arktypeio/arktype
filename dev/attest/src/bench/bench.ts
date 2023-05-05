import * as process from "node:process"
import type { AttestConfig } from "../config.js"
import { getConfig } from "../config.js"
import { caller } from "../main.js"
import { addListener } from "../shell.js"
import type { SourcePosition } from "../utils.js"
import { chainableNoOpProxy } from "../utils.js"
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
}

export type InternalBenchOptions = BenchOptions & {
    fakeCallMs?: number | "count"
}

export type BenchContext = {
    qualifiedPath: string[]
    qualifiedName: string
    options: InternalBenchOptions
    cfg: AttestConfig
    benchCallPosition: SourcePosition
    lastSnapCallPosition: SourcePosition | undefined
    isAsync: boolean
}

export type BenchAssertionContext = BenchContext & {
    kind: TimeAssertionName | "types"
}

export type BenchableFunction = () => unknown | Promise<unknown>

export type InitialBenchAssertions<Fn extends BenchableFunction> =
    BenchAssertions<Fn> & BenchTypeAssertions

const currentSuitePath: string[] = []
export const unhandledExceptionMessages: string[] = []

addListener("beforeExit", () => {
    if (unhandledExceptionMessages.length) {
        console.error(
            `${unhandledExceptionMessages.length} unhandled exception(s) occurred during your benches (see details above).`
        )
        process.exit(1)
    }
})

export const bench = <Fn extends BenchableFunction>(
    name: string,
    fn: Fn,
    options: BenchOptions = {}
): InitialBenchAssertions<Fn> => {
    const qualifiedPath = [...currentSuitePath, name]
    const ctx: BenchContext = {
        qualifiedPath,
        qualifiedName: qualifiedPath.join("/"),
        options,
        cfg: getConfig(),
        benchCallPosition: caller(),
        lastSnapCallPosition: undefined,
        isAsync: fn.constructor.name === "AsyncFunction"
    }
    if (
        typeof ctx.cfg.filter === "string" &&
        !qualifiedPath.includes(ctx.cfg.filter)
    ) {
        return chainableNoOpProxy
    } else if (
        Array.isArray(ctx.cfg.filter) &&
        ctx.cfg.filter.some((segment, i) => segment !== qualifiedPath[i])
    ) {
        return chainableNoOpProxy
    }
    const assertions = new BenchAssertions(fn, ctx)
    Object.assign(assertions, createBenchTypeAssertion(ctx))
    return assertions as any
}

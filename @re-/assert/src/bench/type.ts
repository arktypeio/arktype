import { Func } from "@re-/tools"
import { Node } from "ts-morph"
import { findCallExpressionAncestor } from "../value/snapshot.js"
import { BenchContext, BaseBenchOptions } from "./bench.js"
import { BenchCallAssertions, getBenchCallAssertions, stats } from "./call.js"

export type BenchTypeAssertions = {
    [K in keyof BenchCallAssertions]: Func<
        Parameters<BenchCallAssertions[K]>,
        void
    >
}

export type BenchType = {
    type: BenchTypeAssertions &
        ((options?: BaseBenchOptions) => BenchTypeAssertions)
}

export const getBenchTypeAssertions = (ctx: BenchContext) => {
    const benchmarkTypes = (options: BaseBenchOptions = {}) => {
        const benchFn = findCallExpressionAncestor(
            ctx.benchCallPosition,
            "bench"
        ).getArguments()[1]
        if (!Node.isBodied(benchFn)) {
            throw new Error(
                `Expected the second arg passed to bench to be a function, e.g.:` +
                    `bench("myFn", () => doSomethingCool())` +
                    `Your second arg was parsed as '${benchFn.getKindName()}'.`
            )
        }
        return getBenchCallAssertions(
            () => {
                benchFn
                    .getBody()
                    .getDescendants()
                    .map((node) => Node.isTyped(node) && node.getType())
            },
            {
                ...ctx,
                options: {
                    ...options,
                    hooks: {
                        beforeCall: () =>
                            benchFn.setBodyText(benchFn.getBodyText())
                    }
                },
                fromType: true
            }
        )
    }
    return {
        type: new Proxy(benchmarkTypes, {
            get: (target, prop) => {
                if (prop in stats || prop === "mark") {
                    return (benchmarkTypes() as any)[prop]
                }
                return (target as any)[prop]
            }
        })
    } as any as BenchType
}

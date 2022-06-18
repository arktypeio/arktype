import { Node } from "ts-morph"
import { findCallExpressionAncestor } from "../value/snapshot.js"
import { BaseBenchOptions, BenchContext } from "./bench.js"
import { BenchAssertions, stats } from "./call.js"

export type BenchTypeAssertions = {
    type: BenchAssertions<() => void, {}> &
        ((options?: BaseBenchOptions) => BenchAssertions<() => void, {}>)
}

const createBenchTypeAssertion =
    (ctx: BenchContext) =>
    (options: BaseBenchOptions = {}) => {
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
        return new BenchAssertions(
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
                isTypeAssertion: true
            }
        )
    }

export const createBenchTypeAssertions = (ctx: BenchContext) => {
    const benchmarkTypes = createBenchTypeAssertion(ctx)
    return {
        type: new Proxy(benchmarkTypes, {
            get: (target, prop) => {
                if (prop in stats || prop === "mark") {
                    return (benchmarkTypes() as any)[prop]
                }
                return (target as any)[prop]
            }
        })
    } as any as BenchTypeAssertions
}

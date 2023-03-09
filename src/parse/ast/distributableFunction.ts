import type { DomainsNode } from "../../nodes/node.ts"
import type { NarrowableRules } from "../../nodes/rules/rules.ts"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { evaluate } from "../../utils/generics.ts"
import { keysOf } from "../../utils/generics.ts"
import { stringify } from "../../utils/serialize.ts"
import type { ParseContext } from "../definition.ts"

export type DistributableFunction<
    input = any,
    args extends any[] = any[],
    output = unknown
> = (input: input, ...args: args) => output

export type distributable<f extends DistributableFunction> =
    | f
    | distributeFunction<f>

export type distributeFunction<f extends DistributableFunction> =
    f extends DistributableFunction<infer input, infer args, infer output>
        ? evaluate<{
              [domain in domainOf<input>]?: (
                  input: unknown extends input
                      ? unknown
                      : Extract<input, inferDomain<domain>>,
                  ...args: args
              ) => output
          }>
        : never

export const writeMalformedDistributableFunctionMessage = (def: unknown) =>
    `Expected a Function or Record<Domain, Function> operand (${stringify(
        def
    )} was invalid)`

export type DistributedFunctionNode<
    f,
    ruleKey extends keyof NarrowableRules
> = {
    [domain in Domain]?: FunctionInDomain<f, ruleKey>
}

export type FunctionInDomain<f, ruleKey extends keyof NarrowableRules> = {
    [k in ruleKey]: f
}

export const distributeFunctionToNode = <
    f extends DistributableFunction,
    ruleKey extends keyof NarrowableRules
>(
    distributableFunction: distributable<f>,
    node: DomainsNode,
    ctx: ParseContext,
    ruleKey: ruleKey
): DistributedFunctionNode<f, ruleKey> => {
    const domains = keysOf(node)
    if (!hasDomain(distributableFunction, "object")) {
        return throwParseError(
            writeMalformedDistributableFunctionMessage(distributableFunction)
        )
    }
    const distributed = {} as DistributedFunctionNode<f, ruleKey>
    if (typeof distributableFunction === "function") {
        const domainFunction = {
            [ruleKey]: distributableFunction
        } as any as FunctionInDomain<f, ruleKey>
        for (const domain of domains) {
            distributed[domain] = domainFunction
        }
    } else {
        for (const domain of domains) {
            if (distributableFunction[domain] === undefined) {
                continue
            }
            const functionInDomain = {
                [ruleKey]: distributableFunction[domain]
            } as FunctionInDomain<f, ruleKey>
            if (typeof functionInDomain[ruleKey] !== "function") {
                return throwParseError(
                    writeMalformedDistributableFunctionMessage(functionInDomain)
                )
            }
            distributed[domain] = functionInDomain
        }
    }
    return distributed
}

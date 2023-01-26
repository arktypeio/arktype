import type { TypeNode } from "../../nodes/node.ts"
import { domainsOfNode } from "../../nodes/resolve.ts"
import type { NarrowableRules } from "../../nodes/rules/rules.ts"
import type { Scope } from "../../scope.ts"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { evaluate } from "../../utils/generics.ts"
import { stringify } from "../../utils/serialize.ts"

export type UnaryFunction<input = any, output = unknown> = (
    input: input
) => output

export type distributable<f extends UnaryFunction> = f | distributeFunction<f>

type distributeFunction<f extends UnaryFunction> = f extends UnaryFunction<
    infer input,
    infer output
>
    ? evaluate<{
          [domain in domainOf<input>]?: (
              input: unknown extends input
                  ? unknown
                  : Extract<input, inferDomain<domain>>
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
    f extends UnaryFunction,
    ruleKey extends keyof NarrowableRules
>(
    distributableFunction: distributable<f>,
    inputNode: TypeNode,
    $: Scope,
    ruleKey: ruleKey
): DistributedFunctionNode<f, ruleKey> => {
    const domains = domainsOfNode(inputNode, $)
    if (!hasDomain(distributableFunction, "object")) {
        return throwParseError(
            writeMalformedDistributableFunctionMessage(distributableFunction)
        )
    }
    const distributed = {} as DistributedFunctionNode<f, ruleKey>
    if (typeof distributableFunction === "function") {
        const domainFunction = {
            [ruleKey]: distributableFunction
        } as unknown as FunctionInDomain<f, ruleKey>
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

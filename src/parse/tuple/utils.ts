import type { TypeNode } from "../../nodes/node.ts"
import { domainsOfNode } from "../../nodes/resolve.ts"
import type { Rules } from "../../nodes/rules/rules.ts"
import type { ScopeRoot } from "../../scope.ts"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { evaluate } from "../../utils/generics.ts"
import { stringSerialize } from "../../utils/serialize.ts"

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
    `Expected a Function or Record<Domain, Function> operand (${stringSerialize(
        def
    )} was invalid)`

export type DistributedFunctionNode<
    f,
    ruleKey extends keyof Rules | undefined = undefined
> = {
    [domain in Domain]?: DomainFunction<f, ruleKey>
}

export type DomainFunction<
    f,
    ruleKey extends keyof Rules | undefined
> = ruleKey extends keyof Rules ? { [k in ruleKey]: f } : f

export const distributeFunctionToNode = <
    f extends UnaryFunction,
    ruleKey extends keyof Rules | undefined = undefined
>(
    distributableFunction: distributable<f>,
    inputNode: TypeNode,
    $: ScopeRoot,
    ruleKey?: ruleKey
): DistributedFunctionNode<f, ruleKey> => {
    const domains = domainsOfNode(inputNode, $)
    if (!hasDomain(distributableFunction, "object")) {
        return throwParseError(
            writeMalformedDistributableFunctionMessage(distributableFunction)
        )
    }
    const distributed = {} as DistributedFunctionNode<f, ruleKey>
    if (typeof distributableFunction === "function") {
        const domainFunction: DomainFunction<f, ruleKey> = (
            ruleKey
                ? { [ruleKey]: distributableFunction }
                : distributableFunction
        ) as any
        for (const domain of domains) {
            distributed[domain] = domainFunction
        }
    } else {
        for (const domain of domains) {
            const domainFunction = distributableFunction[
                domain
            ] as DomainFunction<f, ruleKey>
            if (domainFunction !== undefined) {
                if (typeof domainFunction !== "function") {
                    return throwParseError(
                        writeMalformedDistributableFunctionMessage(
                            domainFunction
                        )
                    )
                }
                distributed[domain] = domainFunction
            }
        }
    }
    return distributed
}

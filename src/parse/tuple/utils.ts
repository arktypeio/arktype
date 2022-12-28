import type { TypeNode } from "../../nodes/node.ts"
import { domainsOfNode } from "../../nodes/utils.ts"
import type { Scope } from "../../scope.ts"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { evaluate } from "../../utils/generics.ts"

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

export const buildMalformedDistributableFunctionMessage = (def: unknown) =>
    `Expected a Function or Record<Domain, Function> operand (${JSON.stringify(
        def
    )} was invalid)`

export type DistributedFunctionEntry<F extends UnaryFunction = UnaryFunction> =
    [domain: Domain, distributedFunction: F]

export const entriesOfDistributableFunction = <F extends UnaryFunction>(
    distributableFunction: distributable<F>,
    inputNode: TypeNode,
    scope: Scope
): DistributedFunctionEntry<F>[] => {
    const domains = domainsOfNode(inputNode, scope)
    if (!hasDomain(distributableFunction, "object")) {
        return throwParseError(
            buildMalformedDistributableFunctionMessage(distributableFunction)
        )
    }
    if (typeof distributableFunction === "function") {
        return domains.map((domain) => [domain, distributableFunction])
    }
    const entries: DistributedFunctionEntry<F>[] = []
    for (const domain of domains) {
        const domainValidator = distributableFunction[domain]
        if (domainValidator !== undefined) {
            if (typeof domainValidator !== "function") {
                return throwParseError(
                    buildMalformedDistributableFunctionMessage(domainValidator)
                )
            }
            entries.push([domain, distributableFunction[domain] as F])
        }
    }
    return entries
}

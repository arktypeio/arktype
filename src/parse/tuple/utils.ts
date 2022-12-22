import type { TypeNode } from "../../nodes/node.js"
import { domainsOfNode } from "../../nodes/utils.js"
import type { ScopeRoot } from "../../scope.js"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.js"
import { hasDomain } from "../../utils/domains.js"
import { throwParseError } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"

export type UnaryFunction<In = any, Return = unknown> = (In: In) => Return

export type distributable<f extends UnaryFunction> = f | distributeFunction<f>

type distributeFunction<f extends UnaryFunction> = f extends UnaryFunction<
    infer In,
    infer Return
>
    ? evaluate<{
          [domain in domainOf<In>]?: (
              In: unknown extends In
                  ? unknown
                  : Extract<In, inferDomain<domain>>
          ) => Return
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
    scope: ScopeRoot
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

import type {
    ExplicitDomainEntry,
    MultiDomainEntry,
    TraversalNode
} from "../nodes/node.ts"
import type {
    ExactValueEntry,
    TraversalBranchesEntry
} from "../nodes/predicate.ts"
import type { BoundableData } from "../nodes/rules/range.ts"
import { checkRange } from "../nodes/rules/range.ts"
import type { TraversalRuleEntry } from "../nodes/rules/rules.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf, subdomainOf } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { Dict, evaluate, extend, List } from "../utils/generics.ts"
import type { Problems } from "./problems.ts"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: ScopeRoot
) => {
    return true
}

export type TraversalEntry =
    | MultiDomainEntry
    | ExplicitDomainEntry
    | TraversalRuleEntry
    | ExactValueEntry
    | TraversalBranchesEntry

export type TraversalKey = TraversalEntry[0]

export type TraversalState = {
    node: TraversalNode
    path: string[]
}

export type CheckState<data = unknown> = evaluate<
    TraversalState & {
        data: data
        problems: Problems
    }
>

// Add a root check function that takes in data, a traversal node, and scope. It
// should convert data and the node to an initial CheckState and pass it to the
// next function.

// Convert this check function to take CheckState and ScopeRoot only
export const check = (data: unknown, node: TraversalNode, scope: ScopeRoot) =>
    typeof node === "string"
        ? domainOf(data) === node
        : checkEntries(data, node, scope)

// If there is an error, we want to call some central API and pass in a context
// specific to the current rule that contains additional information needed to
// construct an error message. This should be used both in the default error
// message implementation and what would be passed to a custom error message
// function if one is provided.

// Checkers need to get the full state so they can make updates specific to the
// rule Keep in mind some rules in the future will set "data" directly to some
// transformation of the input
const checkers = {
    regex: (data, regex) => regex.test(data),
    divisor: (data, divisor) => data % divisor === 0,
    domains: (data, domains, scope) => {
        const entries = domains[domainOf(data)]
        return entries ? checkEntries(data, entries, scope) : false
    },
    domain: (data, domain) => domainOf(data) === domain,
    subdomain: (data, subdomain, scope) => {
        const actual = subdomainOf(data)
        if (typeof subdomain === "string") {
            return actual === subdomain
        }
        if (actual !== subdomain[0]) {
            return false
        }
        if (actual === "Array" || actual === "Set") {
            for (const item of data as List | Set<unknown>) {
                if (!check(item, subdomain[1], scope)) {
                    return false
                }
            }
        } else if (actual === "Map") {
            for (const entry of data as Map<unknown, unknown>) {
                if (!check(entry[0], subdomain[1], scope)) {
                    return false
                }
                if (!check(entry[1], subdomain[2] as TraversalNode, scope)) {
                    return false
                }
            }
        } else {
            return throwInternalError(
                `Unexpected subdomain entry ${JSON.stringify(subdomain)}`
            )
        }
        return true
    },
    range: (data, range) => checkRange(data, range),
    requiredProps: (data, props, scope) =>
        props.every(([propKey, propNode]) =>
            check(data[propKey], propNode, scope)
        ),
    optionalProps: (data, props, scope) =>
        props.every(
            ([propKey, propNode]) =>
                !(propKey in data) || check(data[propKey], propNode, scope)
        ),
    branches: (data, branches, scope) =>
        branches.some((condition) => checkEntries(data, condition, scope)),
    refinement: (data, refinement) => refinement(data),
    value: (data, value) => data === value
} satisfies {
    [k in TraversalKey]: (
        // update to take state instead of data
        // state: CheckState<RuleInput<k>>
        data: RuleInput<k>,
        value: Extract<TraversalEntry, [k, unknown]>[1],
        scope: ScopeRoot
        // Update return type to void
    ) => boolean
}

export type ConstrainedRuleInputs = extend<
    { [k in TraversalKey]?: unknown },
    {
        regex: string
        divisor: number
        range: BoundableData
        requiredProps: Dict
        optionalProps: Dict
    }
>

export type RuleInput<k extends TraversalKey> =
    k extends keyof ConstrainedRuleInputs ? ConstrainedRuleInputs[k] : unknown

export const checkEntries = (
    data: unknown,
    entries: readonly TraversalEntry[],
    scope: ScopeRoot
): boolean => {
    for (let i = 0; i < entries.length; i++) {
        if (
            !checkers[entries[i][0]](
                data as never,
                entries[i][1] as never,
                scope
            )
        ) {
            return false
        }
    }
    return true
}

import type {
    ExplicitDomainEntry,
    FlatNode,
    MultiDomainEntry
} from "../nodes/node.js"
import type { ExactValueEntry, FlatBranchesEntry } from "../nodes/predicate.js"
import type { BoundableData } from "../nodes/rules/range.js"
import { checkRange } from "../nodes/rules/range.js"
import type { RuleEntry } from "../nodes/rules/rules.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, subdomainOf } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dict, List } from "../utils/generics.js"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: ScopeRoot
) => {
    return true
}

export type FlatEntry =
    | MultiDomainEntry
    | ExplicitDomainEntry
    | RuleEntry
    | ExactValueEntry
    | FlatBranchesEntry

export const check = (data: unknown, node: FlatNode, scope: ScopeRoot) =>
    typeof node === "string"
        ? domainOf(data) === node
        : checkEntries(data, node, scope)

const checkers = {
    regex: (data: string, regex) => regex.test(data),
    divisor: (data: number, divisor) => data % divisor === 0,
    domains: (data: unknown, domains, scope) => {
        const entries = domains[domainOf(data)]
        return entries ? checkEntries(data, entries, scope) : false
    },
    domain: (data: unknown, domain) => domainOf(data) === domain,
    // TODO: Fix
    subdomain: (data: unknown, subdomain, scope) => {
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
                if (!check(entry[1], subdomain[2] as FlatNode, scope)) {
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
    range: (data: BoundableData, range) =>
        checkRange(data as BoundableData, range),
    requiredProps: (data: Dict, props, scope) =>
        props.every(([propKey, propNode]) =>
            check(data[propKey], propNode, scope)
        ),
    optionalProps: (data: Dict, props, scope) =>
        props.every(
            ([propKey, propNode]) =>
                !(propKey in data) || check(data[propKey], propNode, scope)
        ),
    branches: (data: unknown, branches, scope) =>
        branches.some((condition) => checkEntries(data, condition, scope)),
    validator: (data: unknown, validator) => validator(data),
    value: (data: unknown, value) => data === value
} satisfies {
    [k in FlatEntry[0]]: (
        data: any,
        value: Extract<FlatEntry, [k, unknown]>[1],
        scope: ScopeRoot
    ) => boolean
}

export const checkEntries = (
    data: unknown,
    entries: readonly FlatEntry[],
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

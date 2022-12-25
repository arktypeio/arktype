import type { ScopeRoot } from "../../scope.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type { CollapsibleList, Dict } from "../../utils/generics.ts"
import { composeIntersection, composeKeyedOperation } from "../compose.ts"
import type { PredicateContext } from "../predicate.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorIntersection } from "./divisor.ts"
import type {
    PropsRule,
    TraversalOptionalProps,
    TraversalRequiredProps
} from "./props.ts"
import { compileProps, propsIntersection } from "./props.ts"
import type { Range } from "./range.ts"
import { rangeIntersection } from "./range.ts"
import { getRegex, regexIntersection } from "./regex.ts"
import type { SubdomainRule, TraversalSubdomainRule } from "./subdomain.ts"
import { compileSubdomain, subdomainIntersection } from "./subdomain.ts"

export type Rules<domain extends Domain = Domain, scope extends Dict = Dict> = {
    readonly subdomain?: SubdomainRule<scope>
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<scope>
    readonly refinement?: CollapsibleList<Refinement<inferDomain<domain>>>
}

export type TraversalRuleEntry =
    | ["subdomain", TraversalSubdomainRule]
    | ["regex", RegExp]
    | ["divisor", number]
    | ["range", Range]
    | TraversalRequiredProps
    | TraversalOptionalProps
    | ["refinement", Refinement]

export type Refinement<data = unknown> = (data: data) => boolean

export type RuleSet<
    domain extends Domain,
    scope extends Dict
> = Domain extends domain
    ? Rules
    : domain extends "object"
    ? defineRuleSet<
          "object",
          "subdomain" | "props" | "range" | "refinement",
          scope
      >
    : domain extends "string"
    ? defineRuleSet<"string", "regex" | "range" | "refinement", scope>
    : domain extends "number"
    ? defineRuleSet<"number", "divisor" | "range" | "refinement", scope>
    : defineRuleSet<domain, "refinement", scope>

type defineRuleSet<
    domain extends Domain,
    keys extends keyof Rules,
    scope extends Dict
> = Pick<Rules<domain, scope>, keys>

const refinementIntersection =
    composeIntersection<CollapsibleList<Refinement>>(collapsibleListUnion)

export const rulesIntersection = composeKeyedOperation<Rules, PredicateContext>(
    {
        subdomain: subdomainIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        range: rangeIntersection,
        refinement: refinementIntersection
    },
    { onEmpty: "bubble" }
)

export type FlattenAndPushRule<t> = (
    entries: TraversalRuleEntry[],
    rule: t,
    scope: ScopeRoot
) => void

const ruleCompilers: {
    [k in keyof Rules]-?: FlattenAndPushRule<Rules[k] & {}>
} = {
    subdomain: compileSubdomain,
    regex: (entries, rule) => {
        if (typeof rule === "string") {
            entries.push(["regex", getRegex(rule)])
        } else {
            for (const source of rule) {
                entries.push(["regex", getRegex(source)])
            }
        }
    },
    divisor: (entries, rule) => {
        entries.push(["divisor", rule])
    },
    range: (entries, rule) => {
        entries.push(["range", rule])
    },
    props: compileProps,
    refinement: (entries, rule) => {
        if (typeof rule === "function") {
            entries.push(["refinement", rule])
        } else {
            for (const refinement of rule) {
                entries.push(["refinement", refinement])
            }
        }
    }
}

const rulePrecedenceMap: { readonly [k in TraversalRuleEntry[0]]-?: number } = {
    // Critical: No other checks are performed if these fail
    subdomain: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    regex: 1,
    divisor: 1,
    range: 1,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    requiredProps: 2,
    optionalProps: 3,
    // Validation: Only performed if all shallow and deep checks pass
    refinement: 4
}

export const compileRules = (
    rules: Rules,
    scope: ScopeRoot
): readonly TraversalRuleEntry[] => {
    const entries: TraversalRuleEntry[] = []
    let k: keyof Rules
    for (k in rules) {
        ruleCompilers[k](entries, rules[k] as any, scope)
    }
    return entries.sort(
        (l, r) => rulePrecedenceMap[l[0]] - rulePrecedenceMap[r[0]]
    )
}

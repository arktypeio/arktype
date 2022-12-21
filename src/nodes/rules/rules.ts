import type { ScopeRoot } from "../../scope.js"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.js"
import type { CollapsibleList, Dict, evaluate } from "../../utils/generics.js"
import { composeIntersection, composeKeyedOperation } from "../compose.js"
import type { PredicateContext } from "../predicate.js"
import { collapsibleListUnion } from "./collapsibleSet.js"
import { divisorIntersection } from "./divisor.js"
import type {
    FlatOptionalProps,
    FlatRequiredProps,
    PropsRule
} from "./props.js"
import { flattenProps, propsIntersection } from "./props.js"
import type { Range } from "./range.js"
import { rangeIntersection } from "./range.js"
import { getRegex, regexIntersection } from "./regex.js"
import type { FlatSubdomainRule, SubdomainRule } from "./subdomain.js"
import { flattenSubdomain, subdomainIntersection } from "./subdomain.js"

export type Rules<domain extends Domain = Domain, scope extends Dict = Dict> = {
    readonly subdomain?: SubdomainRule<scope>
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<scope>
    readonly validator?: CollapsibleList<Validator<inferDomain<domain>>>
}

export type RuleEntry =
    | ["subdomain", FlatSubdomainRule]
    | ["regex", RegExp]
    | ["divisor", number]
    | ["range", Range]
    | FlatRequiredProps
    | FlatOptionalProps
    | ["validator", Validator]

export type Validator<data = unknown> = (data: data) => boolean

// TODO: Allow as input
export type DistributedValidator<data = unknown> = evaluate<{
    [domain in domainOf<data>]?: Validator<Extract<data, inferDomain<domain>>>
}>

export type RuleSet<
    domain extends Domain,
    scope extends Dict
> = Domain extends domain
    ? Rules
    : domain extends "object"
    ? defineRuleSet<
          "object",
          "subdomain" | "props" | "range" | "validator",
          scope
      >
    : domain extends "string"
    ? defineRuleSet<"string", "regex" | "range" | "validator", scope>
    : domain extends "number"
    ? defineRuleSet<"number", "divisor" | "range" | "validator", scope>
    : defineRuleSet<domain, "validator", scope>

type defineRuleSet<
    domain extends Domain,
    keys extends keyof Rules,
    scope extends Dict
> = Pick<Rules<domain, scope>, keys>

const validatorIntersection =
    composeIntersection<CollapsibleList<Validator>>(collapsibleListUnion)

export const rulesIntersection = composeKeyedOperation<Rules, PredicateContext>(
    {
        subdomain: subdomainIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        range: rangeIntersection,
        validator: validatorIntersection
    },
    { onEmpty: "bubble" }
)

export type FlattenAndPushRule<t> = (
    entries: RuleEntry[],
    rule: t,
    scope: ScopeRoot
) => void

const flattenAndPushMap: {
    [k in keyof Rules]-?: FlattenAndPushRule<Rules[k] & {}>
} = {
    subdomain: flattenSubdomain,
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
    props: flattenProps,
    validator: (entries, rule) => {
        if (typeof rule === "function") {
            entries.push(["validator", rule])
        } else {
            for (const validator of rule) {
                entries.push(["validator", validator])
            }
        }
    }
}

const rulePrecedenceMap: { readonly [k in RuleEntry[0]]-?: number } = {
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
    validator: 4
}

export const flattenRules = (
    rules: Rules,
    scope: ScopeRoot
): readonly RuleEntry[] => {
    const entries: RuleEntry[] = []
    let k: keyof Rules
    for (k in rules) {
        flattenAndPushMap[k](entries, rules[k] as any, scope)
    }
    return entries.sort(
        (l, r) => rulePrecedenceMap[l[0]] - rulePrecedenceMap[r[0]]
    )
}

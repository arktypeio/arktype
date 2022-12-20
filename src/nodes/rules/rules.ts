import type { ScopeRoot } from "../../scope.js"
import type { Domain, domainOf, inferDomain } from "../../utils/domains.js"
import type {
    CollapsibleList,
    Dict,
    entryOf,
    evaluate,
    extend
} from "../../utils/generics.js"
import { composeIntersection, composeKeyedOperation } from "../compose.js"
import type { PredicateContext } from "../predicate.js"
import { collapsibleListUnion } from "./collapsibleSet.js"
import { divisorIntersection } from "./divisor.js"
import type { FlatPropsRules, PropsRules } from "./props.js"
import { propsIntersection } from "./props.js"
import type { Range } from "./range.js"
import { rangeIntersection } from "./range.js"
import { getRegex, regexIntersection } from "./regex.js"
import type { FlatSubdomainRule, SubdomainRule } from "./subdomain.js"
import { flattenSubdomain, subdomainIntersection } from "./subdomain.js"

export type Rules<domain extends Domain = Domain, scope extends Dict = Dict> = {
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly subdomain?: SubdomainRule<scope>
    readonly props?: PropsRules<scope>
    readonly validator?: CollapsibleList<Validator<inferDomain<domain>>>
}

export type FlattenAndPushRule<t> = (
    entries: RuleEntry[],
    rule: t,
    scope: ScopeRoot
) => void

const flattenAndPushMap: {
    [k in keyof Rules]-?: FlattenAndPushRule<Rules[k] & {}>
} = {
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
    validator: (entries, rule) => {
        if (typeof rule === "function") {
            entries.push(["validator", rule])
        } else {
            for (const validator of rule) {
                entries.push(["validator", validator])
            }
        }
    },
    subdomain: flattenSubdomain,
    props: (entries, props) => {
        entries.push(["props", props] as any)
    }
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
    return entries
}

export type RuleEntry = entryOf<
    extend<
        { [k in Exclude<keyof Rules, "props">]-?: unknown },
        evaluate<
            {
                regex: RegExp
                divisor: number
                subdomain: FlatSubdomainRule
                range: Range
                validator: Validator
            } & FlatPropsRules
        >
    >
>

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

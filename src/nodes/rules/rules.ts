import type {
    Domain,
    domainOf,
    inferDomain,
    Subdomain
} from "../../utils/domains.js"
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
import { regexIntersection } from "./regex.js"
import type { SubdomainRule } from "./subdomain.js"
import { subdomainIntersection } from "./subdomain.js"

export type Rules<domain extends Domain = Domain, scope extends Dict = Dict> = {
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly subdomain?: SubdomainRule
    readonly props?: PropsRules<scope>
    readonly range?: Range
    readonly validator?: CollapsibleList<Validator<inferDomain<domain>>>
}

export type FlatRule = entryOf<
    extend<
        { [k in Exclude<keyof Rules, "props">]-?: unknown },
        evaluate<
            {
                regex: RegExp
                divisor: number
                subdomain: Subdomain
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

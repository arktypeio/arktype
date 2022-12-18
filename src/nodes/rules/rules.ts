import type {
    Domain,
    domainOf,
    inferDomain,
    ObjectKind
} from "../../utils/domains.js"
import type {
    CollapsibleList,
    Dictionary,
    evaluate,
    keySet
} from "../../utils/generics.js"
import {
    composeIntersection,
    composeKeyedOperation,
    empty,
    equal
} from "../compose.js"
import type { TypeNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"
import { collapsibleListUnion } from "./collapsibleSet.js"
import { divisorIntersection } from "./divisor.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"
import type { Range } from "./range.js"
import { rangeIntersection } from "./range.js"
import { regexIntersection } from "./regex.js"

export type Rules<
    domain extends Domain = Domain,
    scope extends Dictionary = Dictionary
> = {
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly requiredKeys?: keySet
    readonly props?: Dictionary<TypeNode<scope>>
    readonly propTypes?: {
        readonly number?: TypeNode<scope>
        readonly string?: TypeNode<scope>
    }
    readonly kind?: ObjectKind
    readonly range?: Range
    readonly validator?: ValidatorRule<domain>
}

export type ValidatorRule<domain extends Domain = Domain> = CollapsibleList<
    Validator<inferDomain<domain>>
>

export type Validator<data = unknown> = (data: data) => boolean

export type DistributedValidator<data = unknown> = evaluate<{
    [domain in domainOf<data>]?: Validator<Extract<data, inferDomain<domain>>>
}>

export type RuleSet<
    domain extends Domain,
    scope extends Dictionary
> = Domain extends domain
    ? Rules
    : domain extends "object"
    ? defineRuleSet<
          "object",
          | "kind"
          | "props"
          | "requiredKeys"
          | "propTypes"
          | "range"
          | "validator",
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
    scope extends Dictionary
> = Pick<Rules<domain, scope>, keys>

export const kindIntersection = composeIntersection<ObjectKind>((l, r) =>
    l === r ? equal : empty
)

const validatorIntersection =
    composeIntersection<CollapsibleList<Validator>>(collapsibleListUnion)

export const rulesIntersection = composeKeyedOperation<Rules, PredicateContext>(
    {
        kind: kindIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        requiredKeys: requiredKeysIntersection,
        propTypes: propsIntersection,
        range: rangeIntersection,
        validator: validatorIntersection
    },
    { propagateEmpty: true }
)

import type {
    classify,
    Domain,
    inferDomain,
    ObjectDomain
} from "../../utils/classify.js"
import type {
    CollapsibleList,
    Dictionary,
    evaluate,
    keySet
} from "../../utils/generics.js"
import type { TypeNode } from "../node.js"
import type { Range } from "./range.js"

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
    readonly kind?: ObjectDomain
    readonly range?: Range
    readonly validator?: ValidatorRule<domain>
}

export type ValidatorRule<domain extends Domain = Domain> = CollapsibleList<
    Validator<inferDomain<domain>>
>

export type Validator<data = unknown> = (data: data) => boolean

export type DistributedValidator<data = unknown> = evaluate<{
    [domain in classify<data>]?: Validator<Extract<data, inferDomain<domain>>>
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
    : domain extends string
    ? defineRuleSet<"string", "regex" | "range" | "validator", scope>
    : domain extends number
    ? defineRuleSet<"number", "divisor" | "range" | "validator", scope>
    : defineRuleSet<domain, "validator", scope>

type defineRuleSet<
    domain extends Domain,
    keys extends keyof Rules,
    scope extends Dictionary
> = Pick<Rules<domain, scope>, keys>

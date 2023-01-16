import type { Narrow } from "../../parse/tuple/narrow.ts"
import type { ScopeRoot } from "../../scope.ts"
import type { TraversalEntry } from "../../traverse/check.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type { classOf, CollapsibleList, Dict } from "../../utils/generics.ts"
import { composeIntersection, composeKeyedOperation } from "../compose.ts"
import type { PredicateContext } from "../predicate.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorIntersection } from "./divisor.ts"
import { instanceofIntersection } from "./instanceof.ts"
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

export type Rules<domain extends Domain = Domain, $ = Dict> = {
    readonly subdomain?: SubdomainRule<$>
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<$>
    readonly instanceof?: classOf<unknown>
    readonly narrow?: CollapsibleList<
        Narrow<Domain extends domain ? any : inferDomain<domain>>
    >
}

export type TraversalRuleEntry =
    | ["subdomain", TraversalSubdomainRule]
    | ["regex", RegExp]
    | ["divisor", number]
    | ["range", Range]
    | ["instanceof", classOf<unknown>]
    | TraversalRequiredProps
    | TraversalOptionalProps
    | ["narrow", Narrow]

export type RuleSet<domain extends Domain, $> = Domain extends domain
    ? Rules
    : domain extends "object"
    ? defineRuleSet<
          "object",
          "subdomain" | "props" | "range" | "narrow" | "instanceof",
          $
      >
    : domain extends "string"
    ? defineRuleSet<"string", "regex" | "range" | "narrow", $>
    : domain extends "number"
    ? defineRuleSet<"number", "divisor" | "range" | "narrow", $>
    : defineRuleSet<domain, "narrow", $>

type defineRuleSet<domain extends Domain, keys extends keyof Rules, $> = Pick<
    Rules<domain, $>,
    keys
>

const narrowIntersection =
    composeIntersection<CollapsibleList<Narrow>>(collapsibleListUnion)

export const rulesIntersection = composeKeyedOperation<Rules, PredicateContext>(
    {
        subdomain: subdomainIntersection,
        divisor: divisorIntersection,
        regex: regexIntersection,
        props: propsIntersection,
        instanceof: instanceofIntersection,
        range: rangeIntersection,
        narrow: narrowIntersection
    },
    { onEmpty: "bubble" }
)

export type FlattenAndPushRule<t> = (
    entries: TraversalRuleEntry[],
    rule: t,
    $: ScopeRoot
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
    instanceof: (entries, rule) => {
        entries.push(["instanceof", rule])
    },
    props: compileProps,
    narrow: (entries, rule) => {
        if (typeof rule === "function") {
            entries.push(["narrow", rule])
        } else {
            for (const narrow of rule) {
                entries.push(["narrow", narrow])
            }
        }
    }
}
export const precedenceMap: {
    readonly [k in TraversalEntry[0]]: number
} = {
    // Critical: No other checks are performed if these fail
    domain: 0,
    value: 0,
    domains: 0,
    branches: 0,
    subdomain: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    instanceof: 1,
    regex: 1,
    divisor: 1,
    range: 1,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    requiredProps: 2,
    optionalProps: 3,
    // Narrow: Only performed if all shallow and deep checks pass
    narrow: 4
}

export const compileRules = (
    rules: Rules,
    $: ScopeRoot
): readonly TraversalRuleEntry[] => {
    const entries: TraversalRuleEntry[] = []
    let k: keyof Rules
    for (k in rules) {
        ruleCompilers[k](entries, rules[k] as any, $)
    }
    return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

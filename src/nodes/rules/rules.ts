import type { ParseContext } from "../../parse/definition.ts"
import type { Morph } from "../../parse/tuple/morph.ts"
import type { Narrow } from "../../parse/tuple/narrow.ts"
import { traverse } from "../../traverse/check.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type {
    CollapsibleList,
    constructor,
    Dict
} from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { Intersector } from "../compose.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { TraversalEntry } from "../node.ts"
import { classIntersection } from "./class.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorIntersection } from "./divisor.ts"
import type {
    PropsRule,
    TraversalOptionalProps,
    TraversalRequiredProps
} from "./props.ts"
import { flattenProps, propsIntersection } from "./props.ts"
import type { Range } from "./range.ts"
import { rangeIntersection } from "./range.ts"
import { getRegex, regexIntersection } from "./regex.ts"
import type { SubdomainRule, TraversalSubdomainRule } from "./subdomain.ts"
import { flattenSubdomain, subdomainIntersection } from "./subdomain.ts"

export type NarrowableRules<$ = Dict> = {
    readonly subdomain?: SubdomainRule<$>
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<$>
    readonly class?: constructor
    readonly narrow?: NarrowRule
}

export type LiteralRules<domain extends Domain = Domain> = {
    readonly value: inferDomain<domain>
}

export type NarrowRule = CollapsibleList<Narrow>

export type Branch<domain extends Domain = Domain, $ = Dict> =
    | Rules<domain, $>
    | MorphBranch<domain, $>

export type MorphBranch<domain extends Domain = Domain, $ = Dict> = {
    input: Rules<domain, $>
    morph: CollapsibleList<Morph>
}

export type BranchEntry =
    | ["subdomain", TraversalSubdomainRule]
    | ["regex", RegExp]
    | ["divisor", number]
    | ["range", Range]
    | ["class", constructor]
    | TraversalRequiredProps
    | TraversalOptionalProps
    | ["narrow", Narrow]
    | ["value", unknown]
    | ["morph", Morph]

export type Rules<
    domain extends Domain = Domain,
    $ = Dict
> = Domain extends domain
    ? NarrowableRules | LiteralRules
    : domain extends "object"
    ? defineRuleSet<
          domain,
          "subdomain" | "props" | "range" | "narrow" | "class",
          $
      >
    : domain extends "string"
    ? defineRuleSet<domain, "regex" | "range" | "narrow", $>
    : domain extends "number"
    ? defineRuleSet<domain, "divisor" | "range" | "narrow", $>
    : defineRuleSet<domain, "narrow", $>

type defineRuleSet<
    domain extends Domain,
    keys extends keyof NarrowableRules,
    $
> = Pick<NarrowableRules<$>, keys> | LiteralRules<domain>

const rulesOf = (branch: Branch): Rules =>
    (branch as MorphBranch).input ?? branch

export const branchIntersection: Intersector<Branch> = (l, r, state) => {
    const lRules = rulesOf(l)
    const rRules = rulesOf(r)
    const rulesResult = rulesIntersection(lRules, rRules, state)
    if ("morph" in l) {
        if ("morph" in r) {
            if (l.morph === r.morph) {
                state.addMorph("=")
                return isEquality(rulesResult) || isDisjoint(rulesResult)
                    ? rulesResult
                    : {
                          input: rulesResult,
                          morph: l.morph
                      }
            }
            state.addMorph("lr")
            // TODO: better way to throw an error on morph intersection
            return state.addDisjoint("morph", l.morph, r.morph)
        }
        state.addMorph("l")
        return isDisjoint(rulesResult)
            ? rulesResult
            : {
                  input: isEquality(rulesResult) ? l.input : rulesResult,
                  morph: l.morph
              }
    }
    if ("morph" in r) {
        state.addMorph("r")
        return isDisjoint(rulesResult)
            ? rulesResult
            : {
                  input: isEquality(rulesResult) ? r.input : rulesResult,
                  morph: r.morph
              }
    }
    return rulesResult
}

export const rulesIntersection: Intersector<Rules> = (l, r, state) =>
    "value" in l
        ? "value" in r
            ? l.value === r.value
                ? equality()
                : state.addDisjoint("value", l.value, r.value)
            : literalSatisfiesRules(l.value, r, state.ctx)
            ? l
            : state.addDisjoint("leftAssignability", l, r)
        : "value" in r
        ? literalSatisfiesRules(r.value, l, state.ctx)
            ? r
            : state.addDisjoint("rightAssignability", l, r)
        : narrowableRulesIntersection(l, r, state)

const narrowIntersection =
    composeIntersection<CollapsibleList<Narrow>>(collapsibleListUnion)

export const narrowableRulesIntersection =
    composeKeyedIntersection<NarrowableRules>(
        {
            subdomain: subdomainIntersection,
            divisor: divisorIntersection,
            regex: regexIntersection,
            props: propsIntersection,
            class: classIntersection,
            range: rangeIntersection,
            narrow: narrowIntersection
        },
        { onEmpty: "bubble" }
    )

export type FlattenAndPushRule<t> = (
    entries: BranchEntry[],
    rule: t,
    ctx: ParseContext
) => void

type UnknownRules = NarrowableRules & Partial<LiteralRules>

const ruleFlatteners: {
    [k in keyof UnknownRules]-?: FlattenAndPushRule<UnknownRules[k] & {}>
} = {
    subdomain: flattenSubdomain,
    regex: (entries, rule) => {
        for (const source of listFrom(rule)) {
            entries.push(["regex", getRegex(source)])
        }
    },
    divisor: (entries, rule) => {
        entries.push(["divisor", rule])
    },
    range: (entries, rule) => {
        entries.push(["range", rule])
    },
    class: (entries, rule) => {
        entries.push(["class", rule])
    },
    props: flattenProps,
    narrow: (entries, rule) => {
        for (const narrow of listFrom(rule)) {
            entries.push(["narrow", narrow])
        }
    },
    value: (entries, rule) => {
        entries.push(["value", rule])
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
    switch: 0,
    alias: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    class: 1,
    regex: 1,
    divisor: 1,
    range: 1,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    requiredProps: 2,
    optionalProps: 2,
    // Narrow: Only performed if all shallow and deep checks pass
    narrow: 3,
    // Morph: Only performed if all validation passes
    morph: 4
}

export const flattenBranch = (
    branch: Branch,
    ctx: ParseContext
): BranchEntry[] => {
    if ("morph" in branch) {
        const result = flattenRules(branch.input, ctx)
        for (const morph of listFrom(branch.morph)) {
            result.push(["morph", morph])
        }
        return result
    }
    return flattenRules(branch, ctx)
}

const flattenRules = (
    rules: UnknownRules,
    ctx: ParseContext
): BranchEntry[] => {
    const entries: BranchEntry[] = []
    let k: keyof UnknownRules
    for (k in rules) {
        ruleFlatteners[k](entries, rules[k] as any, ctx)
    }
    return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

export const literalSatisfiesRules = (
    data: unknown,
    rules: NarrowableRules,
    ctx: ParseContext
) => "data" in traverse(data, flattenRules(rules, ctx), ctx.$, {})

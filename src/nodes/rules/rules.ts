import { writeImplicitNeverMessage } from "../../parse/string/ast.ts"
import type { Narrow } from "../../parse/tuple/narrow.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type {
    CollapsibleList,
    constructor,
    Dict
} from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { IntersectionState, Intersector } from "../compose.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { FlattenContext, TraversalEntry } from "../node.ts"
import type {
    Branch,
    BranchWithMetadata,
    FlatBranch,
    FlatMorphedBranch
} from "../predicate.ts"
import { branchHasMetadata } from "../predicate.ts"

import { classIntersection } from "./class.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorIntersection } from "./divisor.ts"
import type { ObjectKindRule, TraversalObjectKindRule } from "./objectKind.ts"
import { flattenObjectKind, objectKindIntersection } from "./objectKind.ts"
import type {
    PropsRule,
    TraversalOptionalProps,
    TraversalRequiredProps
} from "./props.ts"
import { flattenProps, propsIntersection } from "./props.ts"
import type { FlatBound, Range } from "./range.ts"
import { flattenRange, rangeIntersection } from "./range.ts"
import { regexIntersection } from "./regex.ts"

export type NarrowableRules<$ = Dict> = {
    readonly objectKind?: ObjectKindRule<$>
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

export type FlatRules = RuleEntry[]

export type RuleEntry =
    | ["objectKind", TraversalObjectKindRule]
    | ["regex", string]
    | ["divisor", number]
    | ["bound", FlatBound]
    | ["class", constructor]
    | TraversalRequiredProps
    | TraversalOptionalProps
    | ["narrow", Narrow]
    | ["value", unknown]

export type Rules<
    domain extends Domain = Domain,
    $ = Dict
> = Domain extends domain
    ? NarrowableRules | LiteralRules
    : domain extends "object"
    ? defineRuleSet<
          domain,
          "objectKind" | "props" | "range" | "narrow" | "class",
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
    (branch as BranchWithMetadata).rules ?? branch

export const branchIntersection: Intersector<Branch> = (l, r, state) => {
    const lRules = rulesOf(l)
    const rRules = rulesOf(r)
    const rulesResult = rulesIntersection(lRules, rRules, state)
    if ("morph" in l) {
        if ("morph" in r) {
            if (l.morph === r.morph) {
                return isEquality(rulesResult) || isDisjoint(rulesResult)
                    ? rulesResult
                    : {
                          rules: rulesResult,
                          morph: l.morph
                      }
            }
            return state.lastOperator === "&"
                ? throwParseError(
                      writeImplicitNeverMessage(
                          state.path,
                          "Intersection",
                          "of morphs"
                      )
                  )
                : {}
        }
        return isDisjoint(rulesResult)
            ? rulesResult
            : {
                  rules: isEquality(rulesResult) ? l.rules : rulesResult,
                  morph: l.morph
              }
    }
    if ("morph" in r) {
        return isDisjoint(rulesResult)
            ? rulesResult
            : {
                  rules: isEquality(rulesResult) ? r.rules : rulesResult,
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
            : literalSatisfiesRules(l.value, r, state)
            ? l
            : state.addDisjoint("leftAssignability", l, r)
        : "value" in r
        ? literalSatisfiesRules(r.value, l, state)
            ? r
            : state.addDisjoint("rightAssignability", l, r)
        : narrowableRulesIntersection(l, r, state)

const narrowIntersection =
    composeIntersection<CollapsibleList<Narrow>>(collapsibleListUnion)

export const narrowableRulesIntersection =
    composeKeyedIntersection<NarrowableRules>(
        {
            objectKind: objectKindIntersection,
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
    entries: RuleEntry[],
    rule: t,
    ctx: FlattenContext
) => void

type UnknownRules = NarrowableRules & Partial<LiteralRules>

const ruleFlatteners: {
    [k in keyof UnknownRules]-?: FlattenAndPushRule<UnknownRules[k] & {}>
} = {
    objectKind: flattenObjectKind,
    regex: (entries, rule) => {
        for (const source of listFrom(rule)) {
            entries.push(["regex", source])
        }
    },
    divisor: (entries, rule) => {
        entries.push(["divisor", rule])
    },
    range: flattenRange,
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
    objectKind: 0,
    switch: 0,
    alias: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    class: 1,
    regex: 1,
    divisor: 1,
    bound: 1,
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
    ctx: FlattenContext
): FlatBranch => {
    if (branchHasMetadata(branch)) {
        const result = flattenRules(branch.rules, ctx) as FlatMorphedBranch
        if (branch.morph) {
            result.push(["morph", branch.morph])
        }
        return result
    }
    return flattenRules(branch, ctx)
}

const flattenRules = (rules: UnknownRules, ctx: FlattenContext): FlatBranch => {
    const entries: RuleEntry[] = []
    let k: keyof UnknownRules
    for (k in rules) {
        ruleFlatteners[k](entries, rules[k] as any, ctx)
    }
    return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

export const literalSatisfiesRules = (
    data: unknown,
    rules: NarrowableRules,
    state: IntersectionState
) =>
    !state.type.meta.scope.type(["node", { [state.domain!]: rules }])(data)
        .problems

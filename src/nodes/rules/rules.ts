import type { Narrow } from "../../parse/tuple/narrow.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type {
    CollapsibleList,
    constructor,
    Dict
} from "../../utils/generics.ts"
import { listFrom } from "../../utils/generics.ts"
import type { DefaultObjectKind } from "../../utils/objectKinds.ts"
import type { IntersectionState, Intersector } from "../compose.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality
} from "../compose.ts"
import type { FlattenContext, TraversalEntry, TraversalKey } from "../node.ts"
import { classIntersection } from "./class.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorIntersection } from "./divisor.ts"
import type { PropEntry, PropsRule } from "./props.ts"
import { flattenProps, propsIntersection } from "./props.ts"
import type { FlatBound, Range } from "./range.ts"
import { flattenRange, rangeIntersection } from "./range.ts"
import { regexIntersection } from "./regex.ts"

export type NarrowableRules<$ = Dict> = {
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<$>
    readonly class?: DefaultObjectKind | constructor
    readonly narrow?: NarrowRule
}

export type LiteralRules<
    domain extends Domain = Domain,
    value extends inferDomain<domain> = inferDomain<domain>
> = {
    readonly value: value
}

export type NarrowRule = CollapsibleList<Narrow>

export type FlatRules = RuleEntry[]

export type RuleEntry =
    | ["regex", string]
    | ["divisor", number]
    | ["bound", FlatBound]
    | ["class", DefaultObjectKind | constructor]
    | PropEntry
    | ["narrow", Narrow]
    | ["value", unknown]

export type Rules<
    domain extends Domain = Domain,
    $ = Dict
> = Domain extends domain
    ? NarrowableRules | LiteralRules
    : domain extends "object"
    ? defineRuleSet<domain, "props" | "range" | "narrow" | "class", $>
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
            divisor: divisorIntersection,
            regex: regexIntersection,
            props: propsIntersection,
            class: classIntersection,
            range: rangeIntersection,
            narrow: narrowIntersection
        },
        { onEmpty: "bubble" }
    )

export const flattenRules = (
    rules: UnknownRules,
    ctx: FlattenContext
): TraversalEntry[] => {
    const entries: RuleEntry[] = []
    let k: keyof UnknownRules
    for (k in rules) {
        ruleFlatteners[k](entries, rules[k] as any, ctx)
    }
    return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

export type FlattenAndPushRule<t> = (
    entries: RuleEntry[],
    rule: t,
    ctx: FlattenContext
) => void

type UnknownRules = NarrowableRules & Partial<LiteralRules>

const ruleFlatteners: {
    [k in keyof UnknownRules]-?: FlattenAndPushRule<UnknownRules[k] & {}>
} = {
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
    readonly [k in TraversalKey]: number
} = {
    // Critical: No other checks are performed if these fail
    config: 0,
    domain: 0,
    value: 0,
    domains: 0,
    branches: 0,
    switch: 0,
    alias: 0,
    class: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    regex: 1,
    divisor: 1,
    bound: 1,
    // Prerequisite: These are deep checks with special priority, e.g. the
    // length of a tuple, which causes other deep props not to be checked if it
    // is invalid
    prerequisiteProp: 2,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    requiredProp: 3,
    optionalProp: 3,
    indexProp: 3,
    // Narrow: Only performed if all shallow and deep checks pass
    narrow: 4,
    // Morph: Only performed if all validation passes
    morph: 5
}

export const literalSatisfiesRules = (
    data: unknown,
    rules: NarrowableRules,
    state: IntersectionState
) =>
    !state.type.meta.scope.type(["node", { [state.domain!]: rules }])(data)
        .problems

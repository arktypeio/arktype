import { writeImplicitNeverMessage } from "../../parse/ast/intersection.ts"
import type { Narrow } from "../../parse/ast/narrow.ts"
import type { TypeConfig } from "../../scopes/type.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type {
    CollapsibleList,
    constructor,
    defined,
    Dict,
    evaluate,
    extend
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
import type {
    DistilledPropsEntry,
    PropEntry,
    PropsRule,
    StrictPropsEntry
} from "./props.ts"
import { flattenProps, propsIntersection } from "./props.ts"
import type { FlatBound, Range } from "./range.ts"
import { flattenRange, rangeIntersection } from "./range.ts"
import { regexIntersection } from "./regex.ts"

type NarrowableConstraints<$ = Dict> = {
    regex: string
    divisor: number
    range: Range
    props: PropsRule<$>
    class: DefaultObjectKind | constructor
    narrow: Narrow
}

// When intersecting these rules, there will be always be a single result. E.g.,
// intersecting two divisors can always be reduced to a single divisor based on
// their LCM.
type ReducibleKey = Exclude<keyof NarrowableConstraints, IrreducibleKey>

type ReducibleRules<$ = Dict> = {
    readonly [k in ReducibleKey]?: ConfigurableRule<NarrowableConstraints<$>[k]>
}

// Intersecting these rules may not always lead to a reducible result. E.g., the
// intersection of two narrow functions cannot be reduced checking that some
// data satisisfies each operand individually. In these cases, intersections of
// non-equal constraints are stored as lists.
type IrreducibleKey = extend<keyof NarrowableConstraints, "regex" | "narrow">

type IrreducibleRules<$ = Dict> = {
    readonly [k in IrreducibleKey]?: CollapsibleList<
        ConfigurableRule<NarrowableConstraints<$>[k]>
    >
}

export type NarrowableRules<$ = Dict> = evaluate<
    ReducibleRules<$> & IrreducibleRules<$>
>

export type LiteralRules<
    domain extends Domain = Domain,
    value extends inferDomain<domain> = inferDomain<domain>
> = {
    readonly value: ConfigurableRule<value>
}

export type ConfigurableRule<constraint> =
    | constraint
    | ConfiguredRule<constraint>

export type ConfiguredRule<constraint> = [
    constraint: constraint,
    _: ":",
    config: TypeConfig
]

export const ruleHasConfig = <k extends keyof NarrowableConstraints>(
    rule: ConfigurableRule<NarrowableConstraints[k]>
): rule is ConfiguredRule<NarrowableConstraints[k]> =>
    Array.isArray(rule) && rule[1] === ":"

export const composeReducibleRuleIntersection = <k extends ReducibleKey>(
    intersector: Intersector<NarrowableConstraints[k]>
) =>
    composeIntersection<ConfigurableRule<NarrowableConstraints[k]>>(
        (l, r, state) => {
            const lHasConfig = ruleHasConfig(l)
            const rHasConfig = ruleHasConfig(r)
            const constraintResult = intersector(
                lHasConfig ? l[0] : l,
                rHasConfig ? r[0] : r,
                state
            )
            if (lHasConfig) {
                if (rHasConfig) {
                    const result = { ...l[2] }
                    let k: keyof TypeConfig
                    for (k in l[2]) {
                        if (k in r[2]) {
                            if (l[2][k] !== r[2][k]) {
                                return state.lastOperator === "&"
                                    ? throwParseError(
                                          writeImplicitNeverMessage(
                                              state.path,
                                              "Intersection",
                                              `of config values '${l[2][k]}' and '${r[2][k]}' for key '${k}'`
                                          )
                                      )
                                    : {}
                            }
                        }
                    }
                }
            }
            if (rHasConfig) {
                return r
            }
            return constraintResult
        }
    )

export type FlatRules = RuleEntry[]

export type RuleEntry =
    | ["regex", string]
    | ["divisor", number]
    | ["bound", FlatBound]
    | ["class", DefaultObjectKind | constructor]
    | DistilledPropsEntry
    | StrictPropsEntry
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
    keys extends keyof NarrowableConstraints,
    $
> = Pick<NarrowableConstraints<$>, keys> | LiteralRules<domain>

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
    composeKeyedIntersection<NarrowableConstraints>(
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
    // Some entries with the same precedence, e.g. morphs flattened from a list,
    // rely on the fact that JS's builtin sort is stable to behave as expected
    // when traversed:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

export type FlattenAndPushRule<t> = (
    entries: RuleEntry[],
    rule: t,
    ctx: FlattenContext
) => void

type UnknownRules = NarrowableConstraints & Partial<LiteralRules>

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
    // Config: Applies before any checks
    config: -1,
    // Critical: No other checks are performed if these fail
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
    distilledProps: 3,
    strictProps: 3,
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
    rules: NarrowableConstraints,
    state: IntersectionState
) => !state.type.scope.type(["node", { [state.domain!]: rules }])(data).problems

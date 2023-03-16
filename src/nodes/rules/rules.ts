import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type {
    CollapsibleList,
    constructor,
    Dict,
    evaluate
} from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { IntersectionState, Intersector } from "../compose.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality
} from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { compileDivisor, intersectDivisors } from "./divisor.ts"
import { compileInstance, instanceIntersection } from "./instance.ts"
import type { PropsRule } from "./props.ts"
import { compileProps, propsIntersection } from "./props.ts"
import type { Range } from "./range.ts"
import { compileRange, rangeIntersection } from "./range.ts"
import { compileRegex, regexIntersection } from "./regex.ts"
import { compileValueCheck } from "./value.ts"

export type NarrowableRules<$ = Dict> = {
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<$>
    readonly instance?: constructor
    readonly narrow?: NarrowRule
}

export type LiteralRules<
    domain extends Domain = Domain,
    value extends inferDomain<domain> = inferDomain<domain>
> = {
    readonly value: value
}

export type NarrowRule = CollapsibleList<Narrow>

export type Rules<
    domain extends Domain = Domain,
    $ = Dict
> = Domain extends domain
    ? NarrowableRules | LiteralRules
    : domain extends "object"
    ? defineRuleSet<domain, "props" | "range" | "narrow" | "instance", $>
    : domain extends "string"
    ? defineRuleSet<domain, "regex" | "range" | "narrow", $>
    : domain extends "number"
    ? defineRuleSet<domain, "divisor" | "range" | "narrow", $>
    : defineRuleSet<domain, "narrow", $>

export type RuleName = evaluate<keyof NarrowableRules | keyof LiteralRules>

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
            divisor: intersectDivisors,
            regex: regexIntersection,
            props: propsIntersection,
            instance: instanceIntersection,
            range: rangeIntersection,
            narrow: narrowIntersection
        },
        { onEmpty: "bubble" }
    )

export const compileRules = (rules: UnknownRules, c: Compilation) => {
    let result = ""
    if (rules.value) {
        result += compileValueCheck(rules.value, c)
    }
    if (rules.instance) {
        result += compileInstance(rules.instance, c)
    }

    const shallowChecks: string[] = []

    if (rules.divisor) {
        shallowChecks.push(compileDivisor(rules.divisor, c))
    }
    if (rules.range) {
        shallowChecks.push(compileRange(rules.range, c))
    }
    if (rules.regex) {
        shallowChecks.push(compileRegex(rules.regex, c))
    }

    if (shallowChecks.length) {
        result += " && "
        if (shallowChecks.length === 1) {
            result += shallowChecks[0]
        } else {
        }
    }

    if (rules.props) {
        result += " && "
        result += compileProps(rules.props, c)
    }

    if (rules.narrow) {
    }
    return result
}

type UnknownRules = NarrowableRules & Partial<LiteralRules>

export const literalSatisfiesRules = (
    data: unknown,
    rules: NarrowableRules,
    state: IntersectionState
) => !state.type.scope.type(["node", { [state.domain!]: rules }])(data).problems

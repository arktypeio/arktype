import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type {
    CollapsibleList,
    constructor,
    Dict
} from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { IntersectionState, Intersector } from "../compose.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality
} from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { divisorCompilation, divisorIntersection } from "./divisor.ts"
import { instanceOfCompilation, instanceOfIntersection } from "./instanceOf.ts"
import type { PropsRule } from "./props.ts"
import { compileProps, propsIntersection } from "./props.ts"
import type { Range } from "./range.ts"
import { compileRangeLines, rangeIntersection } from "./range.ts"
import { regexCompilation, regexIntersection } from "./regex.ts"
import { compileValueCheck } from "./value.ts"

export type NarrowableRules<$ = Dict> = {
    readonly regex?: CollapsibleList<string>
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule<$>
    readonly instanceOf?: constructor
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
    ? defineRuleSet<domain, "props" | "range" | "narrow" | "instanceOf", $>
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
            instanceOf: instanceOfIntersection,
            range: rangeIntersection,
            narrow: narrowIntersection
        },
        { onEmpty: "bubble" }
    )

export const compileRules = (rules: UnknownRules, c: Compilation) => {
    const lines: string[] = []
    if (rules.value) {
        lines.push(compileValueCheck(rules.value, c))
    }
    if (rules.instanceOf) {
        lines.push(instanceOfCompilation(rules.instanceOf, c))
    }
    if (rules.divisor) {
        lines.push(divisorCompilation(rules.divisor, c))
    }
    if (rules.range) {
        lines.push(...compileRangeLines(rules.range, c))
    }
    if (rules.regex) {
        lines.push(...regexCompilation(rules.regex, c))
    }
    if (rules.props) {
        lines.push(...compileProps(rules.props, c))
    }
    if (rules.narrow) {
    }
    return lines
}

type UnknownRules = NarrowableRules & Partial<LiteralRules>

export const literalSatisfiesRules = (
    data: unknown,
    rules: NarrowableRules,
    state: IntersectionState
) => !state.type.scope.type(["node", { [state.domain!]: rules }])(data).problems

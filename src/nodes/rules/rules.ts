import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import type {
    CollapsibleList,
    constructor,
    Dict,
    evaluate
} from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { IntersectionState } from "../compose.ts"
import { BaseNode, KeyedNode } from "../compose.ts"
import { collapsibleListUnion } from "./collapsibleSet.ts"
import { compileDivisor, intersectDivisors } from "./divisor.ts"
import { compileInstance, instanceIntersection } from "./instance.ts"
import type { PropsRule } from "./props.ts"
import { compileProps, propsIntersection } from "./props.ts"
import type { Range } from "./range.ts"
import { compileRange, rangeIntersection } from "./range.ts"
import { compileRegex, regexIntersection } from "./regex.ts"
import { compileValueCheck } from "./value.ts"

export abstract class RuleNode<JSON> extends BaseNode<JSON> {
    intersection(node: this, s: IntersectionState): IntersectionResult<this> {}
}

export class BranchNode<domain extends Domain = Domain> extends KeyedNode<{
    [ruleName in RuleName]?: RuleNode<unknown>
}> {
    readonly onEmpty = "bubble"

    compile(c: Compilation): string {
        let result = ""
        if (this.json.value) {
            result += compileValueCheck(this.json.value, c)
        }
        if (this.json.instance) {
            result += compileInstance(this.json.instance, c)
        }

        const shallowChecks: string[] = []

        if (this.json.divisor) {
            shallowChecks.push(compileDivisor(this.json.divisor, c))
        }
        if (this.json.range) {
            shallowChecks.push(compileRange(this.json.range, c))
        }
        if (this.json.regex) {
            shallowChecks.push(compileRegex(this.json.regex, c))
        }

        if (shallowChecks.length) {
            result += " && " + c.mergeChecks(shallowChecks)
        }

        if (this.json.props) {
            result += " && "
            result += compileProps(this.json.props, c)
        }

        if (this.json.narrow) {
        }
        return result
    }
}

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

export const compileRules = (rules: UnknownRules, c: Compilation) => {}

type UnknownRules = NarrowableRules & Partial<LiteralRules>

export const literalSatisfiesRules = (
    data: unknown,
    rules: NarrowableRules,
    state: IntersectionState
) => !state.type.scope.type(["node", { [state.domain!]: rules }])(data).problems

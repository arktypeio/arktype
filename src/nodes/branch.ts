import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Narrow } from "../parse/ast/narrow.ts"
import type { Domain, domainOf, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    constructor,
    defined,
    evaluate,
    mutable
} from "../utils/generics.ts"
import { hasKey } from "../utils/generics.ts"
import type { Compilation } from "./compile.ts"
import type { IntersectionResult, IntersectionState } from "./compose.ts"
import { listUnion } from "./rules/collapsibleSet.ts"
import { compileDivisor } from "./rules/divisor.ts"
import type { DomainNode } from "./rules/domain.ts"
import { compileInstance } from "./rules/instance.ts"
import type { NarrowNode } from "./rules/narrow.ts"
import type { PropsRule } from "./rules/props.ts"
import { compileProps } from "./rules/props.ts"
import type { Range } from "./rules/range.ts"
import { compileRange } from "./rules/range.ts"
import { compileRegex } from "./rules/regex.ts"
import { compileValueCheck } from "./rules/value.ts"

type RuleSetIntersection = Extract<
    IntersectionResult<mutable<RuleSet>>,
    {
        isDisjoint: false
    }
>

export abstract class BranchNode<domain extends Domain = Domain> {
    constructor(public rules: RuleNodes<domain>) {}

    intersect(
        r: BranchNode,
        s: IntersectionState
    ): IntersectionResult<BranchNode> {
        const domain = this.rules.domain
        const intersection: RuleSetIntersection = {
            result: {
                domain: this.rules.domain
            },
            isSubtype: true,
            isSupertype: true,
            isDisjoint: false
        }
        this.#addMorphIntersectionIfPresent(intersection, r, s)
        return s.equality(this as unknown as BranchNode)
    }

    #addMorphIntersectionIfPresent(
        intersection: RuleSetIntersection,
        r: BranchNode,
        s: IntersectionState
    ) {
        if (this.rules.morph) {
            if (r.rules.morph) {
                if (this.rules.morph === r.rules.morph) {
                    intersection.result.morph = this.rules.morph
                } else if (s.lastOperator === "&") {
                    throwParseError(
                        writeImplicitNeverMessage(
                            s.path,
                            "Intersection",
                            "of morphs"
                        )
                    )
                }
                return
            }
            intersection.result.morph = this.rules.morph
        } else if (r.rules.morph) {
            intersection.result.morph = r.rules.morph
        } else {
            return
        }
        // an intersection between a morph type and a non-morph type precludes
        // assignability in either direction.
        intersection.isSubtype = false
        intersection.isSupertype = false
    }

    allows(value: unknown) {
        return true
    }

    // compile(c: Compilation): string {
    //     let result = ""
    //     if (this.rules.value) {
    //         result += compileValueCheck(this.rules.value, c)
    //     }
    //     if (this.rules.instance) {
    //         result += compileInstance(this.rules.instance, c)
    //     }

    //     const shallowChecks: string[] = []

    //     if (this.rules.divisor) {
    //         shallowChecks.push(compileDivisor(this.rules.divisor, c))
    //     }
    //     if (this.rules.range) {
    //         shallowChecks.push(compileRange(this.rules.range, c))
    //     }
    //     if (this.rules.regex) {
    //         shallowChecks.push(compileRegex(this.rules.regex, c))
    //     }

    //     if (shallowChecks.length) {
    //         result += " && " + c.mergeChecks(shallowChecks)
    //     }

    //     if (this.rules.props) {
    //         result += " && "
    //         result += compileProps(this.rules.props, c)
    //     }

    //     if (this.rules.narrow) {
    //     }
    //     return result
    // }
}

type NonNullishDomain = Exclude<Domain, "null" | "undefined">

export class NonNullishBranchNode<
    domain extends NonNullishDomain = NonNullishDomain
> extends BranchNode<domain> {
    addIntersections(
        intersection: RuleSetIntersection,
        r: BranchNode,
        s: IntersectionState
    ) {
        this.#addValueIntersectionIfPresent(intersection, r, s)
    }

    #addValueIntersectionIfPresent(
        intersection: RuleSetIntersection,
        r: BranchNode,
        s: IntersectionState
    ) {
        if (this.rules.value !== undefined) {
            if (r.rules.value !== undefined) {
                if (this.rules.value === r.rules.value) {
                    intersection.result.value = this.rules.value
                } else {
                    return s.disjoint("value", this.rules.value, r.rules.value)
                }
            }
            if (r.allows(this.rules.value)) {
                intersection.result.value = this.rules.value
                intersection.isSupertype = false
            } else {
                return s.disjoint(
                    "leftAssignability",
                    this.rules.value,
                    r.rules
                )
            }
        }
        if (r.rules.value !== undefined) {
            if (this.allows(r.rules.value)) {
                intersection.result.value = r.rules.value
                intersection.isSubtype = false
            } else {
                return s.disjoint(
                    "rightAssignability",
                    this.rules,
                    r.rules.value
                )
            }
        }
    }

    #addNarrowIntersectionIfPresent(
        intersection: RuleSetIntersection,
        r: BranchNode,
        s: IntersectionState
    ) {
        if (this.rules.narrow) {
            if (r.rules.narrow) {
                intersection.result.narrow = this.rules.narrow
            }
        }
    }
}

export type RuleSet<domain extends Domain = Domain> = Domain extends domain
    ? evaluate<UniversalRules<Domain> & NonNullishRules<Domain> & CustomRules>
    : RulesByDomain[domain]

// TODO: evaluate not working?
type RulesByDomain = {
    object: defineCustomRules<"object", "props" | "range" | "instance">
    string: defineCustomRules<"string", "regex" | "range">
    number: defineCustomRules<"number", "divisor" | "range">
    boolean: defineNonNullishRules<"boolean">
    bigint: defineNonNullishRules<"bigint">
    symbol: defineNonNullishRules<"symbol">
    undefined: UniversalRules
    null: UniversalRules
}

type defineCustomRules<
    domain extends Domain,
    ruleKeys extends keyof CustomRules
> = evaluate<
    UniversalRules & NonNullishRules<domain> & Pick<CustomRules, ruleKeys>
>

type defineNonNullishRules<domain extends Domain> = evaluate<
    UniversalRules & NonNullishRules<domain>
>

type CustomRules = {
    readonly regex?: string[]
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule
    readonly instance?: constructor
}

type NonNullishRules<domain extends Domain> = {
    readonly value?: inferDomain<domain>
    readonly narrow?: NarrowNode
}

type UniversalRules = {
    readonly domain: DomainNode
    readonly morph?: Morph[]
}

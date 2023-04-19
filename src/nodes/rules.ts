import type { Filter } from "../parse/ast/filter.js"
import type { inferMorphOut, Morph } from "../parse/ast/morph.js"
import { as } from "../parse/definition.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type {
    conform,
    constructor,
    exact,
    instanceOf,
    keySet
} from "../utils/generics.js"
import { stringify } from "../utils/serialize.js"
import { DivisibilityNode } from "./divisibility.js"
import { DomainNode } from "./domain.js"
import { EqualityNode } from "./equality.js"
import { FilterNode } from "./filter.js"
import { InstanceNode } from "./instance.js"
import { MorphNode } from "./morph.js"
import type { CompiledAssertion } from "./node.js"
import { ComparisonState, Node } from "./node.js"
import type { PropsInput } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class RulesNode<t = unknown> extends Node<typeof RulesNode> {
    declare [as]: t

    readonly kind = "rules"

    constructor(public rules: Rule[]) {
        super(RulesNode, rules)
        validateRuleKeys(this)
    }

    getKinds() {
        return this.rules.map((rule) => rule.kind)
    }

    getEntries() {
        return this.rules.map((rule) => [rule.kind, rule] as RuleEntry)
    }

    getRule<kind extends RuleKind>(kind: kind) {
        return this.rules.find((rule) => rule.kind === kind) as
            | instanceOf<RuleNodeKinds[kind]>
            | undefined
    }

    static from<const input extends RuleSet>(
        input: conform<input, validateConstraintsInput<input>>
    ) {
        const constraints = input as Rules
        const rules: Rule[] = []
        if (constraints.value) {
            rules.push(new EqualityNode(constraints.value))
        } else if (constraints.instance) {
            rules.push(new InstanceNode(constraints.instance))
        } else {
            rules.push(new DomainNode(constraints.domain!))
        }
        if (constraints.divisor) {
            rules.push(new DivisibilityNode(constraints.divisor))
        }
        if (constraints.range) {
            rules.push(new RangeNode(constraints.range))
        }
        if (constraints.regex) {
            rules.push(new RegexNode(constraints.regex))
        }
        if (constraints.props) {
            rules.push(PropsNode.from(constraints.props))
        }
        return new RulesNode<inferRuleSet<input>>(rules)
    }

    static compile(rules: Rule[]) {
        return rules.map((rule) => rule.key).join(" && ") as CompiledAssertion
    }

    intersect(other: RulesNode, s: ComparisonState) {
        // if (
        //     // s.lastOperator === "&" &&
        //     rules.morphs?.some(
        //         (morph, i) => morph !== branch.tree.morphs?.[i]
        //     )
        // ) {
        //     throwParseError(
        //         writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
        //     )
        // }
        const resultInput = Object.fromEntries(this.getEntries())
        for (const rule of other.rules) {
            const matchingRule = this.getRule(rule.kind)
            if (matchingRule) {
                resultInput[rule.kind] = matchingRule.intersect(
                    rule as never,
                    s
                ) as any
            } else {
                resultInput[rule.kind] = rule
            }
        }
        return new RulesNode(resultInput)
    }

    // TODO: find a better way to combine with intersect
    constrain(constraints: Constraints) {
        const resultInput = Object.fromEntries(this.getEntries())
        let kind: RuleKind
        for (kind in constraints) {
            const constraintNode = new (ruleKinds[kind] as constructor<any>)(
                constraints[kind]
            )
            const matchingRule = this.getRule(kind)
            if (matchingRule) {
                resultInput[kind] = matchingRule.intersect(
                    constraintNode as never,
                    new ComparisonState()
                ) as any
            } else {
                resultInput[kind] = constraintNode
            }
        }
        return new RulesNode(resultInput)
    }
}

export const ruleKinds = {
    domain: DomainNode,
    value: EqualityNode,
    instance: InstanceNode,
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filter: FilterNode,
    morph: MorphNode
} as const

type RuleNodeKinds = typeof ruleKinds

type RuleEntry = {
    [k in RuleKind]: [k, instanceOf<RuleNodeKinds[k]>]
}[RuleKind]

export type Rule = instanceOf<RuleNodeKinds[RuleKind]>

export type Constraints = Omit<Rules, "morphs">

export type Rules = {
    [k in RuleKind]?: k extends "props"
        ? PropsInput
        : ConstructorParameters<RuleNodeKinds[k]>[0]
}

type RuleKind = keyof RuleNodeKinds

// TODO: advanced constraints inference
export type inferRuleSet<input extends RuleSet> = input["morph"] extends Morph<
    any,
    infer out
>
    ? (In: inferInput<input>) => inferMorphOut<out>
    : input["morph"] extends [...any[], Morph<any, infer out>]
    ? (In: inferInput<input>) => inferMorphOut<out>
    : inferInput<input>

export type inferInput<input extends RuleSet> = input extends ExactValueRuleSet<
    infer value
>
    ? value
    : input extends ArrayRuleSet
    ? unknown[]
    : input extends NonArrayObjectRuleSet
    ? input["instance"] extends constructor<infer t>
        ? t extends Function
            ? (...args: any[]) => unknown
            : t
        : object
    : input extends DomainRuleSet
    ? inferDomain<input["domain"]>
    : never

type discriminateConstraintsInputBranch<branch extends RuleSet> =
    branch extends {
        domain: infer domain extends Domain
    }
        ? domain extends "object"
            ? branch extends { instance: typeof Array }
                ? ArrayRuleSet
                : NonArrayObjectRuleSet
            : DomainRuleSet & { domain: domain }
        : ExactValueRuleSet

export type validateConstraintsInput<input extends RuleSet> = exact<
    input,
    discriminateConstraintsInputBranch<input>
>

const validateRuleKeys = (rules: RulesNode) => {
    const value = rules.getRule("value")
    if (value) {
        return validateRuleKeysFromSet(
            rules,
            exactValueConstraintKeys,
            "an exact value"
        )
    }
    const domain = rules.getRule("domain")
    if (!domain) {
        return throwParseError(
            `Constraints input must have either a 'value' or 'domain' key (got keys ${stringify(
                Object.keys(rules).join(", ")
            )})`
        )
    }
    switch (domain.domain) {
        case "object":
            const isArray = rules.getRule("instance") instanceof Array
            const allowedKeys = isArray ? arrayRuleKeys : nonArrayObjectRuleKeys
            return validateRuleKeysFromSet(
                rules,
                allowedKeys,
                isArray ? "an array" : "a non-array object"
            )
        case "string":
            return validateRuleKeysFromSet(rules, stringRuleKeys, "a string")
        case "number":
            return validateRuleKeysFromSet(rules, numberRuleKeys, "a number")
        case "bigint":
            return validateRuleKeysFromSet(
                rules,
                baseDomainRuleKeys,
                "a bigint"
            )
        case "symbol":
            return validateRuleKeysFromSet(
                rules,
                baseDomainRuleKeys,
                "a symbol"
            )
        default:
            return throwParseError(
                `Constraints input domain must be either object, string, number, bigint or symbol (was ${domain.domain})`
            )
    }
}

const validateRuleKeysFromSet = (
    rules: RulesNode,
    allowedKeys: keySet<RuleKind>,
    description: string
) => {
    const inputKeys = rules.getKinds()
    const disallowedValueKeys = inputKeys.filter((k) => !(k in allowedKeys))
    if (disallowedValueKeys.length) {
        throwParseError(
            `Constraints ${disallowedValueKeys.join(
                ", "
            )} are not allowed for ${description}.`
        )
    }
}

export type RuleSet = ExactValueRuleSet | DomainRuleSet

type ExactValueRuleSet<value = unknown> = {
    value: value
    morph?: Morph[]
}

const exactValueConstraintKeys: Record<keyof ExactValueRuleSet, true> = {
    value: true,
    morph: true
} as const

type DomainRuleSet = {
    filter?: Filter | Filter[]
    morph?: Morph | Morph[]
} & (
    | NonArrayObjectRuleSet
    | ArrayRuleSet
    | StringRuleSet
    | NumberRuleSet
    | BigintRuleSet
    | SymbolRuleSet
)

const baseDomainRuleKeys = {
    domain: true,
    filter: true,
    morph: true
} as const

type NonArrayObjectRuleSet = {
    domain: "object"
    instance?: constructor
    props?: PropsInput
}

const nonArrayObjectRuleKeys = {
    ...baseDomainRuleKeys,
    instance: true,
    props: true
} as const satisfies Record<keyof NonArrayObjectRuleSet, true>

type ArrayRuleSet = {
    domain: "object"
    instance: typeof Array
    props?: PropsInput
    range?: Bounds
}

const arrayRuleKeys = {
    ...baseDomainRuleKeys,
    instance: true,
    props: true,
    range: true
} as const satisfies Record<keyof ArrayRuleSet, true>

type StringRuleSet = {
    domain: "string"
    regex?: string | string[]
    range?: Bounds
}

const stringRuleKeys = {
    ...baseDomainRuleKeys,
    regex: true,
    range: true
} as const satisfies Record<keyof StringRuleSet, true>

type NumberRuleSet = {
    domain: "number"
    divisor?: number
    range?: Bounds
}

const numberRuleKeys = {
    ...baseDomainRuleKeys,
    divisor: true,
    range: true
} as const satisfies Record<keyof NumberRuleSet, true>

type BigintRuleSet = { domain: "bigint" }

type SymbolRuleSet = { domain: "symbol" }

// type KeyValue = string | number | symbol | RegExp

// const baseKeysByDomain: Record<Domain, readonly KeyValue[]> = {
//     bigint: prototypeKeysOf(0n),
//     boolean: prototypeKeysOf(false),
//     null: [],
//     number: prototypeKeysOf(0),
//     // TS doesn't include the Object prototype in keyof, so keyof object is never
//     object: [],
//     string: prototypeKeysOf(""),
//     symbol: prototypeKeysOf(Symbol()),
//     undefined: []
// }

// const arrayIndexStringBranch = RulesNode.from({
//     domain: "string",
//     regex: wellFormedNonNegativeIntegerMatcher.source
// })

// const arrayIndexNumberBranch = RulesNode.from({
//     domain: "number",
//     range: {
//         ">=": 0
//     },
//     divisor: 1
// })

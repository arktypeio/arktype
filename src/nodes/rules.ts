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
import { hasKey, keysOf, prototypeKeysOf } from "../utils/generics.js"
import { wellFormedNonNegativeIntegerMatcher } from "../utils/numericLiterals.js"
import { stringify } from "../utils/serialize.js"
import { DivisibilityNode } from "./divisibility.js"
import { DomainNode } from "./domain.js"
import { EqualityNode } from "./equality.js"
import { FilterNode } from "./filter.js"
import { InstanceNode } from "./instance.js"
import { MorphNode } from "./morph.js"
import type { CompilationState, CompiledValidator } from "./node.js"
import { ComparisonState, Node } from "./node.js"
import type { PropsInput } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class RulesNode<t = unknown> extends Node<typeof RulesNode> {
    declare [as]: t

    constructor(child: RulesChild) {
        validateRuleKeys(child)
        super(RulesNode, child)
    }

    static from<const input extends RuleSet>(
        input: conform<input, validateConstraintsInput<input>>
    ) {
        const child: RulesChild = {}
        const constraints = input as Rules
        let k: RuleKind
        for (k in constraints) {
            child[k] =
                k === "props"
                    ? PropsNode.from(constraints[k]!)
                    : new (ruleKinds[k] as constructor<any>)(constraints[k])
        }
        return new RulesNode<inferRuleSet<input>>(child)
    }

    static compile(child: RulesChild, s: CompilationState) {
        // TODO: check multiple for traverse
        const checks: CompiledValidator[] =
            child.value?.compile(s) ??
            child.instance?.compile(s) ??
            child.domain!.compile(s)
        if (child.divisor) {
            checks.push(...child.divisor.compile(s))
        }
        if (child.range) {
            checks.push(...child.range.compile(s))
        }
        if (child.regex) {
            checks.push(...child.regex.compile(s))
        }
        if (child.props) {
            checks.push(...child.props.compile(s))
        }
        return checks
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
        let k: RuleKind
        const result = { ...this.child }
        for (k in other.child) {
            if (hasKey(this.child, k)) {
                result[k] = this.child[k].intersect(
                    other.child[k] as never,
                    s
                ) as any
            } else {
                result[k] = other.child as any
            }
        }
        return new RulesNode(result)
    }

    constrain(constraints: Constraints) {
        let k: RuleKind
        const result = { ...this.child }
        for (k in constraints) {
            const constraintNode = new (ruleKinds[k] as constructor<any>)(
                constraints[k]
            )
            if (hasKey(this.child, k)) {
                result[k] = this.child[k].intersect(
                    constraintNode,
                    new ComparisonState()
                ) as any
            } else {
                result[k] = constraintNode
            }
        }
        return new RulesNode(result)
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

type RulesChild = {
    [k in RuleKind]?: instanceOf<RuleNodeKinds[k]>
}

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

const validateRuleKeys = (rules: RulesChild) => {
    if ("value" in rules) {
        return validateRuleKeysFromSet(
            rules,
            exactValueConstraintKeys,
            "an exact value"
        )
    }
    if (!rules.domain) {
        return throwParseError(
            `Constraints input must have either a 'value' or 'domain' key (got keys ${stringify(
                Object.keys(rules).join(", ")
            )})`
        )
    }
    switch (rules.domain.child) {
        case "object":
            const isArray = rules.instance instanceof Array
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
                `Constraints input domain must be either object, string, number, bigint or symbol (was ${rules.domain.child})`
            )
    }
}

const validateRuleKeysFromSet = (
    input: RulesChild,
    allowedKeys: keySet<RuleKind>,
    description: string
) => {
    const inputKeys = keysOf(input)
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

type KeyValue = string | number | symbol | RegExp

const baseKeysByDomain: Record<Domain, readonly KeyValue[]> = {
    bigint: prototypeKeysOf(0n),
    boolean: prototypeKeysOf(false),
    null: [],
    number: prototypeKeysOf(0),
    // TS doesn't include the Object prototype in keyof, so keyof object is never
    object: [],
    string: prototypeKeysOf(""),
    symbol: prototypeKeysOf(Symbol()),
    undefined: []
}

const arrayIndexStringBranch = RulesNode.from({
    domain: "string",
    regex: wellFormedNonNegativeIntegerMatcher.source
})

const arrayIndexNumberBranch = RulesNode.from({
    domain: "number",
    range: {
        ">=": 0
    },
    divisor: 1
})

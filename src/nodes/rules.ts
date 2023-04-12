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
import { keysOf, prototypeKeysOf } from "../utils/generics.js"
import { wellFormedNonNegativeIntegerMatcher } from "../utils/numericLiterals.js"
import { stringify } from "../utils/serialize.js"
import { DivisibilityNode } from "./divisibility.js"
import { DomainNode } from "./domain.js"
import { EqualityNode } from "./equality.js"
import { FilterNode } from "./filter.js"
import { InstanceNode } from "./instance.js"
import { MorphNode } from "./morph.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"
import type { PropsInput } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class RulesNode<t = unknown> extends Node<typeof RulesNode> {
    declare [as]: t

    constructor(child: RulesChild) {
        super(RulesNode, child)
    }

    static from<const input extends RuleSet>(
        input: conform<input, validateConstraintsInput<input>>
    ) {
        const child: RulesChild = {}
        const inputKeys = getValidatedRuleKeys(input as RuleSet)
        const constraints = input as Rules
        for (const k of inputKeys) {
            child[k] =
                k === "props"
                    ? PropsNode.from(constraints[k]!)
                    : new (ruleKinds[k] as constructor<any>)(constraints[k])
        }
        return new RulesNode<inferRuleSet<input>>(child)
    }

    static compile(child: RulesChild, s: CompilationState) {
        let result = ""
        if (child.value) {
            result += child.value.compile(s)
        } else {
            result += child.domain!.compile(s)
        }
        if (child.instance) {
            result += child.instance.compile(s)
        }

        const shallowChecks: string[] = []

        if (child.divisor) {
            shallowChecks.push(child.divisor.compile(s))
        }
        if (child.range) {
            shallowChecks.push(child.range.compile(s))
        }
        if (child.regex) {
            shallowChecks.push(child.regex.compile(s))
        }

        if (shallowChecks.length) {
            result += " && " + s.mergeChecks(shallowChecks)
        }

        if (child.props) {
            result += " && "
            result += child.props.compile(s)
        }

        if (child.filter) {
        }
        return result
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
        return s.path ? this : other
    }

    constrain(constraints: Constraints) {
        // TODO: intersect?
        return RulesNode.from({ ...this.child, ...constraints } as any)
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
            : DomainRuleSet & { domain: branch["domain"] }
        : ExactValueRuleSet

export type validateConstraintsInput<input extends RuleSet> = exact<
    input,
    discriminateConstraintsInputBranch<input>
>

const getValidatedRuleKeys = (rules: RuleSet) => {
    if ("value" in rules) {
        return getValidatedRuleKeysFromSet(
            rules,
            exactValueConstraintKeys,
            "an exact value"
        )
    }
    switch (rules.domain) {
        case "object":
            const isArray = rules.instance instanceof Array
            const allowedKeys = isArray ? arrayRuleKeys : nonArrayObjectRuleKeys
            return getValidatedRuleKeysFromSet(
                rules,
                allowedKeys,
                isArray ? "an array" : "a non-array object"
            )
        case "string":
            return getValidatedRuleKeysFromSet(
                rules,
                stringRuleKeys,
                "a string"
            )
        case "number":
            return getValidatedRuleKeysFromSet(
                rules,
                numberRuleKeys,
                "a number"
            )
        case "bigint":
            return getValidatedRuleKeysFromSet(
                rules,
                baseDomainRuleKeys,
                "a bigint"
            )
        case "symbol":
            return getValidatedRuleKeysFromSet(
                rules,
                baseDomainRuleKeys,
                "a symbol"
            )
        default:
            return throwParseError(
                `Constraints input must have either a 'value' or 'domain' key with a constrainable domain as its value (was ${stringify(
                    rules
                )})`
            )
    }
}

const getValidatedRuleKeysFromSet = (
    input: Rules,
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
    return inputKeys
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

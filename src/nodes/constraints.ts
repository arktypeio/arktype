import type { Filter } from "../parse/ast/filter.js"
import type { Morph } from "../parse/ast/morph.js"
import { as } from "../parse/definition.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import {
    type constructor,
    type exact,
    type instanceOf,
    type keySet,
    keysOf
} from "../utils/generics.js"
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

export class ConstraintsNode<t = unknown> extends Node<typeof ConstraintsNode> {
    declare [as]: t

    constructor(child: ConstraintsChild) {
        super(ConstraintsNode, child)
    }

    static from<input extends ConstraintsInput>(
        input: validateConstraintsInput<input>
    ) {
        const child: ConstraintsChild = {}
        const inputKeys = getValidatedInputKeys(input as ConstraintsInput)
        const constraints = input as RawConstraintsInput
        for (const k of inputKeys) {
            child[k] =
                k === "props"
                    ? PropsNode.from(constraints[k]!)
                    : new (constraintKinds[k] as constructor<any>)(
                          constraints[k]
                      )
        }
        return new ConstraintsNode<inferConstraintsInput<input>>(child)
    }

    static compile(rules: ConstraintsChild, s: CompilationState) {
        return s.data ? `${rules}` : ""
    }

    intersect(other: ConstraintsNode, s: ComparisonState) {
        // if (
        //     // TODO: Fix
        //     // s.lastOperator === "&" &&
        //     this.rules.morphs?.some(
        //         (morph, i) => morph !== branch.tree.morphs?.[i]
        //     )
        // ) {
        //     throwParseError(
        //         writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
        //     )
        // }
        return s.path ? this : other
    }

    constrain(constraints: RawConstraintsInput) {
        // TODO: intersect
        return ConstraintsNode.from({ ...this.child, ...constraints } as any)
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

export const constraintKinds = {
    domain: DomainNode,
    value: EqualityNode,
    instance: InstanceNode,
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filters: FilterNode,
    morphs: MorphNode
} as const

type ConstraintNodeKinds = typeof constraintKinds

type ConstraintsChild = {
    [k in ConstraintKind]?: instanceOf<ConstraintNodeKinds[k]>
}

export type RawConstraintsInput = {
    [k in ConstraintKind]?: k extends "props"
        ? PropsInput
        : instanceOf<ConstraintNodeKinds[k]>["child"]
}

type ConstraintKind = keyof ConstraintNodeKinds

export type inferConstraintsInput<input extends ConstraintsInput> =
    input extends DomainConstraintsInput
        ? inferDomain<input["domain"]>
        : input extends ExactValueInput<infer value>
        ? value
        : never

type discriminateConstraintsInputBranch<branch extends ConstraintsInput> =
    branch extends {
        domain: infer domain extends Domain
    }
        ? domain extends "object"
            ? branch extends { instance: typeof Array }
                ? ArrayConstraints
                : NonArrayObjectConstraints
            : DomainConstraintsInput & { domain: branch["domain"] }
        : ExactValueInput

export type validateConstraintsInput<input extends ConstraintsInput> = exact<
    input,
    discriminateConstraintsInputBranch<input>
>

const getValidatedInputKeys = (input: ConstraintsInput) => {
    if ("value" in input) {
        return getValidatedInputKeysFromSet(
            input,
            exactValueConstraintKeys,
            "an exact value"
        )
    }
    switch (input.domain) {
        case "object":
            const isArray = input.instance instanceof Array
            const allowedKeys = isArray
                ? arrayConstraintKeys
                : nonArrayObjectConstraintKeys
            return getValidatedInputKeysFromSet(
                input,
                allowedKeys,
                isArray ? "an array" : "a non-array object"
            )
        case "string":
            return getValidatedInputKeysFromSet(
                input,
                stringConstraintKeys,
                "a string"
            )
        case "number":
            return getValidatedInputKeysFromSet(
                input,
                numberConstraintKeys,
                "a number"
            )
        case "bigint":
            return getValidatedInputKeysFromSet(
                input,
                baseDomainConstraintKeys,
                "a bigint"
            )
        case "symbol":
            return getValidatedInputKeysFromSet(
                input,
                baseDomainConstraintKeys,
                "a symbol"
            )
        default:
            return throwParseError(
                `Constraints input must have either a 'value' or 'domain' key with a constrainable domain as its value (was ${stringify(
                    input
                )})`
            )
    }
}

const getValidatedInputKeysFromSet = (
    input: RawConstraintsInput,
    allowedKeys: keySet<ConstraintKind>,
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

export type ConstraintsInput = ExactValueInput | DomainConstraintsInput

type ExactValueInput<value = unknown> = {
    value: value
    morphs?: Morph[]
}

const exactValueConstraintKeys: Record<keyof ExactValueInput, true> = {
    value: true,
    morphs: true
} as const

type DomainConstraintsInput = {
    filters?: Filter[]
    morphs?: Morph[]
} & (
    | NonArrayObjectConstraints
    | ArrayConstraints
    | StringConstraints
    | NumberConstraints
    | BigintConstraints
    | SymbolConstraints
)

const baseDomainConstraintKeys = {
    domain: true,
    filters: true,
    morphs: true
} as const

type NonArrayObjectConstraints = {
    domain: "object"
    instance?: constructor
    props?: PropsInput
}

const nonArrayObjectConstraintKeys = {
    ...baseDomainConstraintKeys,
    instance: true,
    props: true
} as const satisfies Record<keyof NonArrayObjectConstraints, true>

type ArrayConstraints = {
    domain: "object"
    instance: typeof Array
    props?: PropsInput
    range?: Bounds
}

const arrayConstraintKeys = {
    ...baseDomainConstraintKeys,
    instance: true,
    props: true,
    range: true
} as const satisfies Record<keyof ArrayConstraints, true>

type StringConstraints = {
    domain: "string"
    regex?: string[]
    range?: Bounds
}

const stringConstraintKeys = {
    ...baseDomainConstraintKeys,
    regex: true,
    range: true
} as const satisfies Record<keyof StringConstraints, true>

type NumberConstraints = {
    domain: "number"
    divisor?: number
    range?: Bounds
}

const numberConstraintKeys = {
    ...baseDomainConstraintKeys,
    divisor: true,
    range: true
} as const satisfies Record<keyof NumberConstraints, true>

type BigintConstraints = { domain: "bigint" }

type SymbolConstraints = { domain: "symbol" }

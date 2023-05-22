import { CompiledFunction } from "../utils/compiledFunction.js"
import type { BasisNode } from "./basis/basis.js"
import { In } from "./compilation.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props.js"
import type { RangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

export type NodeKinds = {
    type: typeof TypeNode
    predicate: typeof PredicateNode
    basis: typeof BasisNode
    divisor: typeof DivisorNode
    range: typeof RangeNode
    regex: typeof RegexNode
    props: typeof PropsNode
    narrow: typeof NarrowNode
    morph: typeof MorphNode
}

export type NodeKind = keyof NodeKinds

type NodeDefinition<rule, input> = {
    readonly kind: NodeKind
    condition(rule: rule): string
    describe(rule: rule): string
    intersect(l: rule, r: rule): rule | Disjoint
    create?(input: input): rule
    // TODO: add toType representation that would allow any arbitrary nodes to be intersected
    // TODO: Visit somehow? Could compose from multiple parts, would give more flexibility
    // compile(rule: rule, condition: string, s: CompilationState): string
}

type NodeMethods<rule> = Record<
    string,
    (this: Node<rule>, ...args: never[]) => unknown
>

// We have to use an interface to reference `this`
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Node<rule = unknown> {
    kind: string
    condition: string
    rule: rule
    allows: (data: unknown) => boolean
    intersect: (other: this) => this | Disjoint
}

export const defineNode =
    <rule, input = rule>() =>
    <
        def extends NodeDefinition<rule, input>,
        methods extends NodeMethods<rule>
    >(
        def: def,
        methods?: methods
    ) => {
        type self = Node<rule> & methods
        const instances: {
            [condition: string]: self
        } = {}
        const intersections: {
            [lCondition: string]: {
                [otherCondition: string]: self | Disjoint
            }
        } = {}
        const createNode = (rule: rule): self => {
            const condition = def.condition(rule)
            if (instances[condition]) {
                return instances[condition]
            }
            const node = Object.assign(
                {
                    kind: def.kind,
                    condition,
                    rule,
                    allows: new CompiledFunction(In, `return ${condition}`),
                    intersect(other) {
                        if (this === other) {
                            return this
                        }
                        if (intersections[condition][other.condition]) {
                            return intersections[condition][other.condition]
                        }
                        const result = def.intersect(this.rule, other.rule)
                        if (result instanceof Disjoint) {
                            intersections[this.condition][other.condition] =
                                result
                            intersections[other.condition][this.condition] =
                                result.invert()
                            return result
                        }
                        const resultNode = createNode(result)
                        intersections[this.condition][other.condition] =
                            resultNode
                        intersections[other.condition][this.condition] =
                            resultNode
                        return resultNode
                    }
                } as Node<rule>,
                methods
            )
            instances[condition] = node
            return node
        }
        return createNode
    }

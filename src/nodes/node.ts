import { CompiledFunction } from "../utils/compiledFunction.js"
import { In } from "./compilation.js"
import { Disjoint } from "./disjoint.js"

type NodeDefinition<rule, input> = {
    readonly kind: string
    condition(rule: rule): string
    describe(rule: rule): string
    intersect(l: rule, r: rule): rule | Disjoint
    create?(input: input): rule
    // TODO: add toType representation that would allow any arbitrary nodes to be intersected
    // TODO: Visit somehow? Could compose from multiple parts, would give more flexibility
    // compile(rule: rule, condition: string, s: CompilationState): string
}

// Need an interface to reference this
/* eslint-disable @typescript-eslint/consistent-type-definitions */
export interface BaseNode<rule> {
    rule: rule
    condition: string
    intersect(other: any): any | Disjoint
    allows(data: unknown): boolean
}

type NodeConstructor<rule, node> = new (rule: rule, condition: string) => node

/* eslint-disable @typescript-eslint/consistent-type-definitions */
export interface Node<rule> extends BaseNode<rule> {
    describe(): string
}

export const defineNode = <rule, node extends Node<rule>>(
    compile: (rule: rule) => string,
    node: (
        base: abstract new (rule: rule, condition: string) => BaseNode<rule>
    ) => new (rule: rule, condition: string) => node
) => {
    const instances: {
        [condition: string]: node
    } = {}
    const intersections: {
        [lCondition: string]: {
            [otherCondition: string]: node | Disjoint
        }
    } = {}
    abstract class Base implements BaseNode<rule> {
        allows: (data: unknown) => boolean
        constructor(public rule: rule, public condition: string) {
            this.allows = new CompiledFunction(`return ${condition}`)
        }

        abstract computeIntersetion(other: node): node | Disjoint

        intersect(other: node) {
            if (this === (other as unknown)) {
                return this
            }
            if (intersections[this.condition][other.condition]) {
                return intersections[this.condition][other.condition]
            }
            const result = this.computeIntersetion(other) // def.intersect(this.rule, other.rule)
            if (result instanceof Disjoint) {
                intersections[this.condition][other.condition] = result
                intersections[other.condition][this.condition] = result.invert()
                return result
            }
            intersections[this.condition][other.condition] = result
            intersections[other.condition][this.condition] = result
            return result
        }
    }
    const Node = node(Base)
    return (rule: rule): node => {
        const condition = compile(rule)
        if (instances[condition]) {
            return instances[condition]
        }
        const instance = new Node(rule, condition)
        instances[condition] = instance
        return instance
    }
}

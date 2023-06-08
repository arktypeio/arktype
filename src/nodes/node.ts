import { In } from "../compile/compile.js"
import { CompiledFunction } from "../utils/functions.js"
import { Disjoint } from "./disjoint.js"

export const precedenceByKind = {
    type: 0,
    predicate: 1,
    basis: 2,
    // shallow checks
    range: 3,
    divisor: 3,
    regex: 3,
    //
    props: 4,
    narrow: 5,
    morph: 6
} as const

export type NodeKind = keyof typeof precedenceByKind

export type NodeDefinition<
    kind extends NodeKind,
    rule,
    node extends Node<kind, rule>
> = {
    kind: kind

    compile(rule: rule): string
    create(base: Node<kind, rule>): node
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Node<kind extends NodeKind = NodeKind, rule = unknown> {
    kind: kind
    rule: rule
    condition: string
    intersect(other: this): this | Disjoint
    intersectionCache: Record<string, this | Disjoint>
    allows(data: unknown): boolean
}

export const defineNodeKind = <
    kind extends NodeKind,
    rule,
    props,
    node extends Node<kind, rule> & props = Node<kind, rule> & props
>(def: {
    kind: kind
    compile: (rule: rule) => string
    construct: (base: Node<kind, rule>) => props
    intersect: (l: node, r: node) => rule | Disjoint
}) => {
    const nodeCache: {
        [condition: string]: node
    } = {}
    const construct = (rule: rule) => {
        const condition = def.compile(rule)
        if (nodeCache[condition]) {
            return nodeCache[condition]
        }
        const base: Node<kind, rule> = {
            kind: def.kind,
            condition,
            rule,
            allows: new CompiledFunction(`${In}`, `return ${condition}`),
            intersectionCache: {},
            intersect(this: node, other: node): node | Disjoint {
                if (this === other) {
                    return this
                }
                if (this.intersectionCache[other.condition]) {
                    return this.intersectionCache[other.condition]
                }
                const result = def.intersect(this, other)
                if (result instanceof Disjoint) {
                    this.intersectionCache[other.condition] = result
                    other.intersectionCache[condition] = result.invert()
                    return result
                }
                const resultNode = construct(result)
                this.intersectionCache[other.condition] = resultNode
                other.intersectionCache[condition] = resultNode
                return resultNode
            }
        }
        return { ...base, ...def.construct(base) } as node
    }
    return construct
}

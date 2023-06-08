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
    node extends Node,
    intersectedAs extends Node = node
> = {
    kind: node["kind"]
    compile: (rule: node["rule"]) => string
    extend?: (
        base: BaseNode<node["kind"], node["rule"]>
    ) => Omit<node, keyof BaseNode>
    intersect: (l: intersectedAs, r: intersectedAs) => intersectedAs | Disjoint
    describe: (node: node) => string
}

// Need an interface to use `this`
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BaseNode<
    kind extends NodeKind = NodeKind,
    rule = unknown,
    intersectedAs = null
> {
    kind: kind
    rule: rule
    condition: string
    intersect(
        other: intersectedAs extends null ? this : intersectedAs
    ): (intersectedAs extends null ? this : intersectedAs) | Disjoint
    intersectionCache: Record<
        string,
        (intersectedAs extends null ? this : intersectedAs) | Disjoint
    >
    allows(data: unknown): boolean
}

export type NodeInput = {
    kind: NodeKind
    rule: unknown
}

export type Node<input extends NodeInput = NodeInput> = BaseNode<
    input["kind"],
    input["rule"]
> &
    input

export const defineNodeKind = <node extends Node>(
    def: NodeDefinition<node>
) => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    const construct = (rule: node["rule"]) => {
        const condition = def.compile(rule)
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        const base: BaseNode<node["kind"], node["rule"]> = {
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
        return (def.extend?.(base) ?? base) as node
    }
    return construct
}

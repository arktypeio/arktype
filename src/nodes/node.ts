import { In } from "../compile/compile.js"
import { CompiledFunction } from "../utils/functions.js"
import type { BasisNode } from "./basis/basis.js"
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

export type NodeDefinition<node extends Node> = {
    kind: node["kind"]
    compile: (rule: node["rule"]) => string
    construct: (base: BaseNode<node["kind"], node["rule"]>) => node
    intersect: (
        l: intersectedAs<node>,
        r: intersectedAs<node>
    ) => intersectedAs<node> | Disjoint
    describe: (node: node) => string
}

type intersectedAs<node extends Node> = node["kind"] extends "basis"
    ? BasisNode
    : node

// Need an interface to use `this`
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface BaseNode<kind extends NodeKind = NodeKind, rule = unknown> {
    kind: kind
    rule: rule
    condition: string
    intersect(other: intersectedAs<this>): intersectedAs<this> | Disjoint
    intersectionCache: IntersectionCache<this>
    allows(data: unknown): boolean
}

type IntersectionCache<node extends Node = Node> = Record<
    string,
    intersectedAs<node> | Disjoint | undefined
>

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
        const intersectionCache: IntersectionCache<node> = {}
        const base: BaseNode<node["kind"], node["rule"]> = {
            kind: def.kind,
            condition,
            rule,
            allows: new CompiledFunction(`${In}`, `return ${condition}`),
            intersectionCache,
            intersect(
                this: intersectedAs<node>,
                other: intersectedAs<node>
            ): intersectedAs<node> | Disjoint {
                if (this === other) {
                    return this
                }
                if (intersectionCache[other.condition]) {
                    return intersectionCache[other.condition]!
                }
                const result = def.intersect(this as never, other as never)
                this.intersectionCache[other.condition] = result
                other.intersectionCache[condition] =
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        return def.construct(base)
    }
    return construct
}

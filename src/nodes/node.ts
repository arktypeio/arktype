import { In } from "../compile/compile.js"
import { CompiledFunction } from "../utils/functions.js"
import type { BasisKind, BasisNode } from "./basis/basis.js"
import type { ClassNode } from "./basis/class.js"
import type { DomainNode } from "./basis/domain.js"
import type { ValueNode } from "./basis/value.js"
import type { DivisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props/props.js"
import type { RangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

export const precedenceByKind = {
    // roots
    type: 0,
    predicate: 1,
    // basis checks
    domain: 2,
    class: 2,
    value: 2,
    // shallow checks
    range: 3,
    divisor: 3,
    regex: 3,
    // deep checks
    props: 4,
    // narrows
    narrow: 5,
    // morphs
    morph: 6
} as const satisfies Record<NodeKind, number>

export type NodeKinds = {
    type: TypeNode
    predicate: PredicateNode
    domain: DomainNode
    class: ClassNode
    value: ValueNode
    range: RangeNode
    divisor: DivisorNode
    regex: RegexNode
    props: PropsNode
    narrow: NarrowNode
    morph: MorphNode
}

export type NodeKind = keyof NodeKinds

export type NodeDefinition<node extends Node> = {
    kind: node["kind"]
    compile: (rule: node["rule"]) => string
    intersect: (
        l: intersectedAs<node>,
        r: intersectedAs<node>
    ) => intersectedAs<node> | Disjoint
    describe: (node: node) => string
    // require a construct call that returns the extra props to assign if and
    // only if all declared props are not present on BaseNode
} & (keyof node extends keyof BaseNode
    ? { extend?: undefined }
    : { extend: NodeExtension<node> })

type NodeExtension<node extends Node> = (
    base: BaseNode<node["kind"], node["rule"]>
) => Omit<node, keyof BaseNode>

type intersectedAs<node extends Node> = node["kind"] extends BasisKind
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
    hasKind(kind: NodeKind): this is NodeKinds[kind]
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
            hasKind: (kind) => kind === def.kind,
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
        return def.extend ? Object.assign(base, def.extend(base)) : base
    }
    return construct
}

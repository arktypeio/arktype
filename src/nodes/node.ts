import { CompiledFunction } from "../utils/compiledFunction.js"
import type { BasisNode } from "./basis/basis.js"
import { In } from "./compilation.js"
import type { MorphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props.js"
import type { RangeNode } from "./constraints/range.js"
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

const cache: { [kind in NodeKind]: Record<string, Node> } = {
    type: {},
    predicate: {},
    basis: {},
    divisor: {},
    range: {},
    regex: {},
    props: {},
    narrow: {},
    morph: {}
}

type Node = any

export const defineNode =
    <rule, input = rule>(def: NodeDefinition<rule, input>) =>
    (rule: rule) => {
        const condition = def.condition(rule)

        if (cache[def.kind][condition]) {
            return cache[def.kind][condition] as any
        }

        const intersectionCache: {
            [leftCondition: string]: {
                [rightCondition: string]: Node | Disjoint
            }
        } = {}

        const node = {
            allows: new CompiledFunction(In, `return ${condition}`),
            intersect(other: Node) {
                if (this === other) {
                    return this
                }
                if (intersectionCache[condition][other.condition]) {
                    return intersectionCache[condition][other.condition]
                }
                const result = def.intersect(rule, other.rule)
                intersectionCache[condition][other.condition] = result
                intersectionCache[other.condition][condition] =
                    result instanceof Disjoint
                        ? result.invert()
                        : (result as any)
                return result
            }
        }
        cache[def.kind][condition] = node
        return node
    }

// compileId(children: children) {
//     return children
//         .map((child) =>
//             typeof child === "string" ? child : child.condition
//         )
//         .sort()
//         .join()
// }

// //subclass extends NodeSubclass<children> = NodeSubclass<any>,
// export abstract class Node<
//     kind extends NodeKind = NodeKind,
//     children extends readonly unknown[] = readonly unknown[],
//     narrowed = unknown
// > {
//     declare allows: (data: unknown) => data is narrowed
//     // declare subclass: NodeKinds[kind]
//     declare kind: kind
//     declare condition: string
//     declare children: children

//     abstract subclass: NodeSubclass<kind, children>
//     abstract intersectNode(other: Nodes[kind]): Nodes[kind] | Disjoint
//     abstract compileTraverse(s: CompilationState): string
//     abstract toString(): string

//     constructor(...children: children) {
//         // TODO: freeze?
//         const subclass = this.constructor.prototype as NodeKinds[kind]
//         const kind = subclass.kind as kind
//         const condition = subclass.compile
//         if (Node.cache[kind][condition]) {
//             return Node.cache[kind][condition] as any
//         }
//         this.kind = kind
//         this.condition = condition
//         this.children = children
//         this.allows = new CompiledFunction(In, `return ${condition}`)
//         ;(Node.cache[kind] as any)[condition] = this
//     }

//     get child() {
//         return this.children[0] as children extends readonly [
//             unknown,
//             ...unknown[]
//         ]
//             ? children[0]
//             : children[0] | undefined
//     }

//     hasKind<kind extends NodeKind>(kind: kind): this is Nodes[kind] {
//         return this.kind === (kind as any)
//     }
// }

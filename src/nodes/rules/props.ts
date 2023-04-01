import type { ComparisonState, CompilationState } from "../node.ts"
import { Node } from "../node.ts"
import type { TypeNode, TypeNodeDefinition } from "../type.ts"

export type PropsDefinition = {
    required?: NamedPropsDefinition
    optional?: NamedPropsDefinition
    prerequisite?: NamedPropsDefinition
    index?: IndexPropDefinition[]
}

type NamedPropsDefinition = Record<string, TypeNodeDefinition>

type IndexPropDefinition = [
    keyType: TypeNodeDefinition,
    valueType: TypeNodeDefinition
]

type PropKind = "required" | "optional" | "prerequisite"

type NamedPropNode = {
    kind: PropKind
    type: TypeNode
}

type NamedPropNodes = Record<string, NamedPropNode>

type IndexPropNode = [keyType: TypeNode, valueType: TypeNode]

export class PropsNode extends Node {
    constructor(
        public named: NamedPropNodes,
        public indexed?: IndexPropNode[]
    ) {
        const propChecks: string[] = []
        // if we don't care about extraneous keys, compile props so we can iterate over the definitions directly
        for (const k in named) {
            const prop = named[k]
            c.path.push(k)
            propChecks.push(prop.type.compile(c))
            c.path.pop()
        }
        super(propChecks.length ? c.mergeChecks(propChecks) : "true")
    }

    intersect(other: PropsNode, s: ComparisonState) {
        const named: NamedPropNodes = {}
        for (const k in this.named) {
            let prop: NamedPropNode
            if (k in other.named) {
                const type = this.named[k].type.intersect(
                    other.named[k].type,
                    s
                )
                const kind =
                    this.named[k].kind === "prerequisite" ||
                    other.named[k].kind === "prerequisite"
                        ? "prerequisite"
                        : this.named[k].kind === "required" ||
                          other.named[k].kind === "required"
                        ? "required"
                        : "optional"
                if (type.isDisjoint() && kind !== "optional") {
                    return type
                }
                prop = {
                    type,
                    kind
                }
            } else {
                prop = this.named[k]
            }
            if (other.indexed) {
                for (const [indexK, indexV] of other.indexed) {
                    if (indexK.allows(k)) {
                        prop.type = prop.type.intersect(indexV, s)
                    }
                }
            }
        }
        for (const name in other.named) {
            named[name] ??= other.named[name]
            if (this.indexed) {
                for (const [indexK, indexV] of this.indexed) {
                    if (indexK.allows(name)) {
                        named[name].type = named[name].type.intersect(indexV, s)
                    }
                }
            }
        }
        return new PropsNode(named, this.intersectIndices(other, s))
    }

    intersectIndices(other: PropsNode, s: ComparisonState) {
        if (!this.indexed) {
            if (!other.indexed) {
                return
            }
            return other.indexed
        }
        if (!other.indexed) {
            return this.indexed
        }
        const intersection: IndexPropNode[] = []
        for (const thisEntry of this.indexed) {
            for (const otherEntry of other.indexed) {
                if (thisEntry[0] === otherEntry[0]) {
                    intersection.push([
                        thisEntry[0],
                        // TODO: path updates here
                        thisEntry[1].intersect(otherEntry[1], s)
                    ])
                } else {
                    // we could check for subtypes between keys, but
                    // without the ability to arbitrarily difference types, we
                    // can't directly exploit those relationships.
                    intersection.push(thisEntry, otherEntry)
                }
            }
        }
        return intersection
    }
}

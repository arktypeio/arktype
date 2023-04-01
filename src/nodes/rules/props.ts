import { hasKey } from "../../utils/generics.ts"
import type { BranchNode } from "../branch.ts"
import type { ComparisonState, CompilationState } from "../node.ts"
import { Node } from "../node.ts"
import type { TypeNodeDefinition } from "../type.ts"
import { TypeNode } from "../type.ts"

export type PropsDefinition = defineProps<TypeNodeDefinition>

export type PropsRule = defineProps<TypeNode>

type defineProps<child> = {
    required?: defineNamedProps<child>
    optional?: defineNamedProps<child>
    prerequisite?: defineNamedProps<child>
    index?: defineIndexProp<child>[]
}

type defineNamedProps<child> = Record<string, child>

type defineIndexProp<child> = [keyType: child, valueType: child]

type PropKind = "required" | "optional" | "prerequisite"

type NamedPropNode = {
    kind: PropKind
    type: TypeNode
}

type PropsByName = Record<string, NamedPropNode>

type IndexProps = [keyType: TypeNode, valueType: TypeNode]

export class PropsNode extends Node<PropsRule> {
    named: PropsByName

    constructor(rule: PropsRule) {
        super(rule, PropsNode)
        this.named = {}
        this.#addNamesOfKind("prerequisite")
        this.#addNamesOfKind("required")
        this.#addNamesOfKind("optional")
    }

    #addNamesOfKind(kind: PropKind) {
        if (hasKey(this.rule, kind)) {
            for (const k in this.rule[kind]) {
                this.named[k] = {
                    kind,
                    type: this.rule[kind][k]
                }
            }
        }
    }

    static compile(rule: PropsRule, c: CompilationState) {
        const propChecks: string[] = []
        // // if we don't care about extraneous keys, compile props so we can iterate over the definitions directly
        // for (const k in named) {
        //     const prop = named[k]
        //     c.path.push(k)
        //     propChecks.push(prop.type.compile(c))
        //     c.path.pop()
        // }
        return propChecks.length ? c.mergeChecks(propChecks) : "true"
    }

    static intersect(l: PropsNode, r: PropsNode, s: ComparisonState) {
        const named: PropsByName = {}
        for (const k in l.named) {
            let prop: NamedPropNode
            if (k in r.named) {
                const type = TypeNode.intersect(
                    l.named[k].type,
                    r.named[k].type,
                    s
                )
                const kind =
                    l.named[k].kind === "prerequisite" ||
                    r.named[k].kind === "prerequisite"
                        ? "prerequisite"
                        : l.named[k].kind === "required" ||
                          r.named[k].kind === "required"
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
                prop = l.named[k]
            }
            if (r.rule.index) {
                for (const [indexK, indexV] of r.rule.index) {
                    if (indexK.allows(k)) {
                        prop.type = prop.type.intersect(indexV, s)
                    }
                }
            }
        }
        for (const name in r.named) {
            named[name] ??= r.named[name]
            if (l.rule.index) {
                for (const [indexK, indexV] of l.rule.index) {
                    if (indexK.allows(name)) {
                        named[name].type = TypeNode.intersect(
                            named[name].type,
                            indexV,
                            s
                        )
                    }
                }
            }
        }
        return new PropsNode(named, PropsNode.intersectIndices(l, r, s))
    }

    static intersectIndices(l: PropsNode, r: PropsNode, s: ComparisonState) {
        if (!l.rule.index) {
            if (!r.rule.index) {
                return
            }
            return r.rule.index
        }
        if (!r.rule.index) {
            return l.rule.index
        }
        const intersection: IndexProps[] = []
        for (const thisEntry of l.rule.index) {
            for (const otherEntry of r.rule.index) {
                if (thisEntry[0] === otherEntry[0]) {
                    intersection.push([
                        thisEntry[0],
                        // TODO: path updates here
                        TypeNode.intersect(thisEntry[1], otherEntry[1], s)
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

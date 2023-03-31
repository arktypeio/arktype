import type { ComparisonState, Compilation } from "../node.ts"
import { Node } from "../node.ts"

export type PropsRule = {
    required?: NamedPropsNodes
    optional?: NamedPropsNodes
    prerequisite?: NamedPropsNodes
    index?: IndexPropsNodes
}

type unwrapChildren<rule> = rule extends Node
    ? unwrapChildren<rule["tree"]>
    : { [k in keyof rule]: unwrapChildren<rule[k]> }

type PropsDefinition = unwrapChildren<PropsRule>

type NamedPropsNodes = Record<string, Node>

export type IndexPropsNodes = [keyType: Node, valueType: Node][]

export class PropsNode extends Node {
    constructor(public readonly tree: PropsRule) {
        super(JSON.stringify(tree))
    }

    intersect(other: PropsNode, s: ComparisonState) {
        const named: PropsDefinition = {}
        for (const k in this.tree) {
            let prop: Prop
            if (k in other.tree) {
                const type = this.tree[k].type.intersect(other.tree[k].type, s)
                const kind =
                    this.tree[k].kind === "prerequisite" ||
                    other.tree[k].kind === "prerequisite"
                        ? "prerequisite"
                        : this.tree[k].kind === "required" ||
                          other.tree[k].kind === "required"
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
                prop = this.tree[k]
            }
            if (other.indexed) {
                for (const [indexK, indexV] of other.indexed) {
                    if (indexK.allows(k)) {
                        prop.type = prop.type.intersect(indexV, s)
                    }
                }
            }
        }
        for (const name in other.tree) {
            named[name] ??= other.tree[name]
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
        const intersection: IndexPropsNodes = []
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

    compile(c: Compilation): string {
        const keyConfig = c.type.config?.keys ?? c.type.scope.config.keys
        return keyConfig === "loose"
            ? this.#compileLooseProps(c)
            : "unimplemented"
    }

    #compileLooseProps(c: Compilation) {
        const propChecks: string[] = []
        // if we don't care about extraneous keys, compile props so we can iterate over the definitions directly
        for (const k in this.tree) {
            const prop = this.tree[k]
            if (k === mappedKeys.index) {
                propChecks.push(c.arrayOf(prop.type))
            } else {
                c.path.push(k)
                propChecks.push(prop.type.compile(c))
                c.path.pop()
            }
        }
        return propChecks.length ? c.mergeChecks(propChecks) : "true"
    }
}

export const mappedKeys = {
    index: "[index]"
} as const

export type MappedKeys = typeof mappedKeys

export type MappedPropKey = MappedKeys[keyof MappedKeys]

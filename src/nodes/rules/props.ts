import type { ComparisonState, Compilation } from "../node.ts"
import type { TypeNode } from "../type.ts"
import { RuleNode } from "./rule.ts"

export type NamedProps = Record<string, NamedProp>

export type NamedProp = {
    type: TypeNode
    kind: "required" | "optional" | "prerequisite"
}

export type IndexProps = [keyType: TypeNode, valueType: TypeNode][]

export class PropsNode extends RuleNode<"props"> {
    constructor(public named: NamedProps, public indexed?: IndexProps) {
        super("props", "TODO")
    }

    intersect(other: PropsNode, s: ComparisonState) {
        const named: NamedProps = {}
        for (const k in this.named) {
            let prop: NamedProp
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
        const intersection: IndexProps = []
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
        for (const k in this.named) {
            const prop = this.named[k]
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

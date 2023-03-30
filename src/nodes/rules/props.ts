import type { ComparisonState, Compilation } from "../node.ts"
import type { TypeNode } from "../type.ts"
import { Rule } from "./rule.ts"

export type Props = {
    required?: NamedProps
    optional?: NamedProps
    prerequisite?: NamedProps
    index?: IndexProps
}

export type NamedProps = Record<string, TypeNode>

export type IndexProps = [keyType: TypeNode, valueType: TypeNode][]

export class PropsRule extends Rule<"props"> {
    constructor(public definition: Props) {
        super("props", "TODO")
    }

    intersect(other: PropsRule, s: ComparisonState) {
        const named: Props = {}
        for (const k in this.definition) {
            let prop: Prop
            if (k in other.definition) {
                const type = this.definition[k].type.intersect(
                    other.definition[k].type,
                    s
                )
                const kind =
                    this.definition[k].kind === "prerequisite" ||
                    other.definition[k].kind === "prerequisite"
                        ? "prerequisite"
                        : this.definition[k].kind === "required" ||
                          other.definition[k].kind === "required"
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
                prop = this.definition[k]
            }
            if (other.indexed) {
                for (const [indexK, indexV] of other.indexed) {
                    if (indexK.allows(k)) {
                        prop.type = prop.type.intersect(indexV, s)
                    }
                }
            }
        }
        for (const name in other.definition) {
            named[name] ??= other.definition[name]
            if (this.indexed) {
                for (const [indexK, indexV] of this.indexed) {
                    if (indexK.allows(name)) {
                        named[name].type = named[name].type.intersect(indexV, s)
                    }
                }
            }
        }
        return new PropsRule(named, this.intersectIndices(other, s))
    }

    intersectIndices(other: PropsRule, s: ComparisonState) {
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
        for (const k in this.definition) {
            const prop = this.definition[k]
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

import type { Key, mutable } from "../../../utils/records.js"
import { fromEntries, hasKeys } from "../../../utils/records.js"
import {
    type CompilationState,
    compilePropAccess,
    In
} from "../../compilation.js"
import type { DiscriminantKind } from "../../discriminate.js"
import type { DisjointsSources } from "../../disjoint.js"
import { Disjoint } from "../../disjoint.js"
import { BaseNode } from "../../node.js"
import {
    neverTypeNode,
    TypeNode,
    typeNodeFromInput,
    unknownTypeNode
} from "../../type.js"
import type { IndexedPropInput, IndexedPropRule } from "./indexed.js"
import { extractArrayIndexRegex } from "./indexed.js"
import type { NamedPropInput, NamedPropRule } from "./named.js"
import { intersectNamedProp } from "./named.js"

export type PropsChildren = [NamedPropsRule, ...IndexedPropRule[]]

// ({
//     kind: "props",
//     condition: (n) => {
//         // Sort keys first by precedence (prerequisite,required,optional),
//         // then alphebetically by name (bar, baz, foo)
//         const sortedNamedEntries = Object.entries(named).sort((l, r) => {
//             const lPrecedence = precedenceByPropKind[l[1].kind]
//             const rPrecedence = precedenceByPropKind[r[1].kind]
//             return lPrecedence > rPrecedence
//                 ? 1
//                 : lPrecedence < rPrecedence
//                 ? -1
//                 : l[0] > r[0]
//                 ? 1
//                 : -1
//         })
//         indexed.sort((l, r) => (l[0].condition >= r[0].condition ? 1 : -1))
//         const condition = PropsNode.compile(sortedNamedEntries, indexed)
//         super("props", condition)
//         this.namedEntries = sortedNamedEntries
//     },
//     describe: (n) => `props`,
//     intersect: (l, r) => l
// })

export class PropsNode extends BaseNode<typeof PropsNode> {
    static readonly kind = "props"

    static compile(entries: PropsChildren) {
        // const checks: string[] = []
        // for (const k in named) {
        //     checks.push(PropsNode.compileNamedEntry([k, named[k]]))
        // }
        // for (const entry of indexed) {
        //     checks.push(PropsNode.compileIndexedEntry(entry))
        // }
        return []
    }

    get namedEntries() {
        return Object.entries(this.named)
    }

    get named() {
        return this.rule[0]
    }

    get indexed() {
        return this.rule.slice(1) as IndexedPropRule[]
    }

    static from(
        namedInput: NamedPropsInput,
        ...indexedInput: IndexedPropInput[]
    ) {
        const named = {} as mutable<NamedPropsRule>
        for (const k in namedInput) {
            named[k] = {
                prerequisite: namedInput[k].prerequisite ?? false,
                optional: namedInput[k].optional ?? false,
                value: typeNodeFromInput(namedInput[k].value)
            }
        }
        const indexed: IndexedPropRule[] = indexedInput.map(
            ({ key, value }) => ({
                key: typeNodeFromInput(key) as TypeNode<string>,
                value: typeNodeFromInput(value)
            })
        )
        return new PropsNode([named, ...indexed])
    }

    toString() {
        const entries = this.namedEntries.map(
            ([key, rule]): [string, string] => {
                return [
                    `${key}${rule.optional ? "?" : ""}`,
                    rule.value.toString()
                ]
            }
        )
        for (const entry of this.indexed) {
            entries.push([`[${entry.key}]`, entry.value.toString()])
        }
        return JSON.stringify(fromEntries(entries))
    }

    compileTraverse(s: CompilationState) {
        return this.namedEntries
            .map((entry) =>
                this.named[entry[0]].value
                    .compileTraverse(s)
                    .replaceAll(In, `${In}${compilePropAccess(entry[0])}`)
            )
            .join("\n")
    }

    computeIntersection(other: PropsNode) {
        let indexed = [...this.indexed]
        for (const { key, value } of other.indexed) {
            const matchingIndex = indexed.findIndex(
                (entry) => entry.key === key
            )
            if (matchingIndex === -1) {
                indexed.push({ key, value })
            } else {
                const result = indexed[matchingIndex].value.intersect(value)
                indexed[matchingIndex].value =
                    result instanceof Disjoint ? neverTypeNode : result
            }
        }
        const named = { ...this.named, ...other.named }
        const disjointsByPath: DisjointsSources = {}
        for (const k in named) {
            // TODO: not all discriminatable- if one optional and one required, even if disjoint
            let intersectedValue: NamedPropRule | Disjoint = named[k]
            if (k in this.named) {
                if (k in other.named) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    intersectedValue = intersectNamedProp(
                        this.named[k],
                        other.named[k]
                    )
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const { key, value } of other.indexed) {
                        if (key.allows(k)) {
                            intersectedValue = intersectNamedProp(
                                this.named[k],
                                {
                                    prerequisite: false,
                                    optional: true,
                                    value
                                }
                            )
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const { key, value } of this.indexed) {
                    if (key.allows(k)) {
                        intersectedValue = intersectNamedProp(other.named[k], {
                            prerequisite: false,
                            optional: true,
                            value
                        })
                    }
                }
            }
            if (intersectedValue instanceof Disjoint) {
                Object.assign(
                    disjointsByPath,
                    intersectedValue.withPrefixKey(k).sources
                )
            } else {
                named[k] = intersectedValue
            }
        }
        if (hasKeys(disjointsByPath)) {
            return new Disjoint(disjointsByPath)
        }
        if (named.length?.prerequisite) {
            // if the index key is from and unbounded array and we have a tuple length,
            // it has already been intersected and should be removed
            indexed = indexed.filter(
                (entry) => !extractArrayIndexRegex(entry.key)
            )
        }
        return new PropsNode([named, ...indexed])
    }

    pruneDiscriminant(path: string[], kind: DiscriminantKind): PropsNode {
        const [key, ...nextPath] = path
        const propAtKey = this.named[key]
        const prunedValue = propAtKey.value.pruneDiscriminant(nextPath, kind)
        const { [key]: _, ...preserved } = this.named
        if (prunedValue !== unknownTypeNode) {
            preserved[key] = {
                ...propAtKey,
                value: prunedValue
            }
        }
        return new PropsNode([preserved, ...this.indexed])
    }

    keyof() {
        return this.namedKeyOf().or(this.indexedKeyOf())
    }

    indexedKeyOf() {
        return new TypeNode(
            this.indexed.flatMap((entry) => entry.key.rule)
        ) as TypeNode<Key>
    }

    namedKeyOf() {
        return TypeNode.fromValue(...this.namedKeyLiterals()) as TypeNode<Key>
    }

    namedKeyLiterals() {
        return this.namedEntries.map((entry) => entry[0])
    }
}

export const emptyPropsNode = new PropsNode([{}])

export type PropsInput = NamedPropsInput | PropsInputTuple

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends IndexedPropInput[] = IndexedPropInput[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Record<string, NamedPropInput>

export type NamedPropsRule = Record<string, NamedPropRule>

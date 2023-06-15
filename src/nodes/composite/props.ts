import { spliterate } from "../../utils/lists.js"
import { isArray } from "../../utils/objectKinds.js"
import { fromEntries, hasKeys } from "../../utils/records.js"
import type { DisjointsSources } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind, isNode } from "../node.js"
import type { IndexedPropInput, IndexedPropRule } from "./indexed.js"
import { extractArrayIndexRegex } from "./indexed.js"
import type { NamedKeyRule, NamedPropInput, NamedPropRule } from "./named.js"
import { compileNamedProp, intersectNamedProp } from "./named.js"
import type { TypeNode } from "./type.js"
import { builtins, typeNode } from "./type.js"

export type KeyRule = NamedKeyRule | TypeNode

export type NodeEntry = NamedPropRule | IndexedPropRule

export type PropsRule = NodeEntry[]

export interface PropsNode extends BaseNode<NodeEntry[]> {
    named: NamedPropRule[]
    indexed: IndexedPropRule[]
    byName: Record<string, NamedPropRule>
}

export type PropsInput = NamedPropsInput | PropsInputTuple

export const isParsedPropsRule = (
    input: PropsInput | PropsRule
): input is PropsRule =>
    isArray(input) && (input.length === 0 || isNode(input[0].value))

export const propsNode = defineNodeKind<PropsNode, PropsInput>(
    {
        kind: "props",
        parse: (input) => {
            const rule = isParsedPropsRule(input)
                ? input
                : parsePropsInput(input)
            return rule.sort((l, r) => {
                // Sort keys first by precedence (prerequisite,required,optional,indexed),
                // then alphebetically by key
                const lPrecedence = kindPrecedence(l.key)
                const rPrecedence = kindPrecedence(r.key)
                return lPrecedence > rPrecedence
                    ? 1
                    : lPrecedence < rPrecedence
                    ? -1
                    : keyNameToString(l.key) > keyNameToString(r.key)
                    ? 1
                    : -1
            })
        },
        compile: (rule, s) => {
            const [named, indexed] = spliterate(rule, isNamed)
            return named.map((named) => compileNamedProp(named, s)).join("\n")
            // if (indexed.length === 0) {
            //     return named.map((named) => compileNamedProp(named, s))
            // }
            // if (indexed.length === 1) {
            //     // if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
            //     const indexMatcher = extractArrayIndexRegex(indexed[0].key)
            //     if (indexMatcher) {
            //         return [compileArray(indexMatcher, indexed[0].value, named)]
            //     }
            // }
            // return [compileIndexed(named, indexed)]
        },
        intersect: (l, r) => intersectProps(l, r)
    },
    (base) => {
        const named = base.rule.filter(isNamed)
        const indexed = base.rule.filter(isIndexed)
        const description = describeProps(named, indexed)
        return {
            description,
            named,
            byName: Object.fromEntries(
                named.map((prop) => [prop.key.name, prop] as const)
            ),
            indexed
        }
    }
)

const intersectProps = (l: PropsNode, r: PropsNode): PropsNode | Disjoint => {
    let indexed = [...l.indexed]
    for (const { key, value } of r.indexed) {
        const matchingIndex = indexed.findIndex((entry) => entry.key === key)
        if (matchingIndex === -1) {
            indexed.push({ key, value })
        } else {
            const result = indexed[matchingIndex].value.intersect(value)
            indexed[matchingIndex].value =
                result instanceof Disjoint ? builtins.never() : result
        }
    }
    const byName = { ...l.byName, ...r.byName }
    const named: NodeEntry[] = []
    const disjointsByPath: DisjointsSources = {}
    for (const k in byName) {
        // TODO: not all discriminatable- if one optional and one required, even if disjoint
        let intersectedValue: NamedPropRule | Disjoint = byName[k]
        if (k in l.byName) {
            if (k in r.byName) {
                // We assume l and r were properly created and the named
                // props from each PropsNode have already been intersected
                // with any matching index props. Therefore, the
                // intersection result will already include index values
                // from both sides whose key types allow k.
                intersectedValue = intersectNamedProp(l.byName[k], r.byName[k])
            } else {
                // If a named key from l matches any index keys of r, intersect
                // the value associated with the name with the index value.
                for (const { key, value } of r.indexed) {
                    if (key.allows(k)) {
                        intersectedValue = intersectNamedProp(l.byName[k], {
                            key: {
                                name: k,
                                prerequisite: false,
                                optional: true
                            },
                            value
                        })
                    }
                }
            }
        } else {
            // If a named key from r matches any index keys of l, intersect
            // the value associated with the name with the index value.
            for (const { key, value } of l.indexed) {
                if (key.allows(k)) {
                    intersectedValue = intersectNamedProp(r.byName[k], {
                        key: {
                            name: k,
                            prerequisite: false,
                            optional: true
                        },
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
            named.push(intersectedValue)
        }
    }
    if (hasKeys(disjointsByPath)) {
        return new Disjoint(disjointsByPath)
    }
    if (
        named.some(
            ({ key }) =>
                !isNode(key) && key.name === "length" && key.prerequisite
        )
    ) {
        // if the index key is from and unbounded array and we have a tuple length,
        // it has already been intersected and should be removed
        indexed = indexed.filter((entry) => !extractArrayIndexRegex(entry.key))
    }
    return propsNode([...named, ...indexed])
}

const parsePropsInput = (input: PropsInput) => {
    const [namedInput, ...indexedInput] = isArray(input) ? input : [input]
    const rule: NodeEntry[] = []
    for (const k in namedInput) {
        rule.push({
            key: {
                name: k,
                prerequisite: namedInput[k].prerequisite ?? false,
                optional: namedInput[k].optional ?? false
            },
            value: typeNode(namedInput[k].value)
        })
    }
    for (const prop of indexedInput) {
        rule.push({
            key: typeNode(prop.key),
            value: typeNode(prop.value)
        })
    }
    return rule
}

const describeProps = (named: NamedPropRule[], indexed: IndexedPropRule[]) => {
    const entries = named.map(({ key, value }): [string, string] => {
        return [`${key.name}${key.optional ? "?" : ""}`, value.toString()]
    })
    for (const entry of indexed) {
        entries.push([`[${entry.key}]`, entry.value.toString()])
    }
    return JSON.stringify(fromEntries(entries))
}

// keyof() {
//     return this.namedKeyOf().or(this.indexedKeyOf())
// }

// indexedKeyOf() {
//     return new TypeNode(
//         this.indexed.flatMap((entry) => entry.key.rule)
//     ) as TypeNode<PropertyKey>
// }

// namedKeyOf() {
//     return TypeNode.exactly(
//         ...this.namedKeyLiterals()
//     ) as TypeNode<PropertyKey>
// }

// namedKeyLiterals() {
//     return this.named.map((prop) => prop.key.name)
// }

const isIndexed = (rule: NodeEntry): rule is IndexedPropRule => isNode(rule.key)

const isNamed = (rule: NodeEntry): rule is NamedPropRule => !isNode(rule.key)

const kindPrecedence = (key: KeyRule) =>
    isNode(key) ? 2 : key.prerequisite ? -1 : key.optional ? 1 : 0

const keyNameToString = (key: KeyRule) => (isNode(key) ? `${key}` : key.name)

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends IndexedPropInput[] = IndexedPropInput[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Record<string, NamedPropInput>

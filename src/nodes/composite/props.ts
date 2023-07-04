import type { Dict } from "../../../dev/utils/src/main.js"
import {
    cached,
    fromEntries,
    hasKeys,
    isArray,
    spliterate
} from "../../../dev/utils/src/main.js"
import { hasArkKind } from "../../compile/registry.js"
import type { DisjointsSources } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../node.js"
import { defineNode } from "../node.js"
import type { CompositeNode } from "./composite.js"
import type { IndexedPropInput, IndexedPropRule } from "./indexed.js"
import {
    compileArray,
    compileIndexed,
    extractArrayIndexRegex
} from "./indexed.js"
import type { NamedKeyRule, NamedPropInput, NamedPropRule } from "./named.js"
import { compileNamedProps, intersectNamedProp } from "./named.js"
import type { TypeNode } from "./type.js"
import { builtins, node, typeNode } from "./type.js"

export type KeyRule = NamedKeyRule | TypeNode

export type NodeEntry = NamedPropRule | IndexedPropRule

export type PropsEntries = readonly NodeEntry[]

export interface PropsNode
    extends CompositeNode<"props", PropsEntries, PropsInput> {
    named: NamedPropRule[]
    indexed: IndexedPropRule[]
    byName: Record<string, NamedPropRule>
    keyof(): TypeNode
    indexedKeyOf(): TypeNode
    namedKeyOf(): TypeNode
    literalKeys: (string | symbol)[]
}

export type PropsInput = NamedPropsInput | PropsInputTuple

export const isParsedPropsRule = (
    input: PropsInput | PropsEntries
): input is PropsEntries =>
    isArray(input) && (input.length === 0 || hasArkKind(input[0].value, "node"))

export const propsNode = defineNode<PropsNode>(
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
        compile: (rule, ctx) => {
            const [named, indexed] = spliterate(rule, isNamed)
            if (indexed.length === 0) {
                return compileNamedProps(named, ctx)
            }
            if (indexed.length === 1) {
                // if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
                const indexMatcher = extractArrayIndexRegex(indexed[0].key)
                if (indexMatcher) {
                    return compileArray(
                        indexMatcher,
                        indexed[0].value,
                        named,
                        ctx
                    )
                }
            }
            return compileIndexed(named, indexed, ctx)
        },
        getReferences: (entries) =>
            entries.flatMap((entry) =>
                hasArkKind(entry.key, "node") &&
                // since array indices have a special compilation process, we
                // don't need to store a reference their type
                !extractArrayIndexRegex(entry.key)
                    ? [
                          entry.key,
                          ...entry.key.references,
                          entry.value,
                          ...entry.value.references
                      ]
                    : [entry.value, ...entry.value.references]
            ),
        intersect: (l, r) => intersectProps(l, r)
    },
    (base) => {
        const named = base.children.filter(isNamed)
        const indexed = base.children.filter(isIndexed)
        const description = describeProps(named, indexed)
        const literalKeys = named.map((prop) => prop.key.name)
        const namedKeyOf = cached(() => node.literal(...literalKeys))
        const indexedKeyOf = cached(() =>
            typeNode(indexed.flatMap((entry) => entry.key.branches))
        )
        return {
            description,
            named,
            byName: fromEntries(named.map((prop) => [prop.key.name, prop])),
            indexed,
            literalKeys,
            keyof: cached(() => namedKeyOf().or(indexedKeyOf())),
            indexedKeyOf,
            namedKeyOf
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
            indexed[matchingIndex] = {
                key,
                value: result instanceof Disjoint ? builtins.never() : result
            }
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
                !hasArkKind(key, "node") &&
                key.name === "length" &&
                key.prerequisite
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
    const children: NodeEntry[] = []
    for (const name in namedInput) {
        const prop = namedInput[name]
        rule.push({
            key: {
                name,
                prerequisite: prop.prerequisite ?? false,
                optional: prop.optional ?? false
            },
            value: hasArkKind(prop.value, "node")
                ? prop.value
                : typeNode(prop.value)
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

const isIndexed = (children: NodeEntry): rule is IndexedPropRule =>
    hasArkKind(rule.key, "node")

const isNamed = (children: NodeEntry): rule is NamedPropRule => !isIndexed(rule)

const kindPrecedence = (key: KeyRule) =>
    hasArkKind(key, "node") ? 2 : key.prerequisite ? -1 : key.optional ? 1 : 0

const keyNameToString = (key: KeyRule) =>
    hasArkKind(key, "node") ? `${key}` : key.name

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends readonly IndexedPropInput[] = readonly IndexedPropInput[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Dict<string, NamedPropInput>

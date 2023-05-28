import { throwInternalError } from "../../../utils/errors.js"
import type { Key } from "../../../utils/records.js"
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
import { compileIndexedProp, extractArrayIndexRegex } from "./indexed.js"
import type { NamedPropInput, NamedPropRule } from "./named.js"
import { compileNamedProp, intersectNamedProp } from "./named.js"

export type PropRule = NamedPropRule | IndexedPropRule

const isIndexed = (rule: PropRule): rule is IndexedPropRule =>
    typeof rule.key === "object"

const kindPrecedence = (rule: PropRule) =>
    isIndexed(rule) ? 2 : rule.prerequisite ? -1 : rule.optional ? 1 : 0

export class PropsNode extends BaseNode<typeof PropsNode> {
    static readonly kind = "props"

    normalize(rule: PropRule[]) {
        rule.sort((l, r) => {
            // Sort keys first by precedence (prerequisite,required,optional,indexed),
            // then alphebetically by key (bar, baz, foo)
            const lPrecedence = kindPrecedence(l)
            const rPrecedence = kindPrecedence(r)
            return lPrecedence > rPrecedence
                ? 1
                : lPrecedence < rPrecedence
                ? -1
                : l.key.toString() > r.key.toString()
                ? 1
                : -1
        })
    }

    static compile(rule: PropRule[]): string[] {
        return rule.map((rule) =>
            isIndexed(rule) ? compileIndexedProp(rule) : compileNamedProp(rule)
        )
    }

    get named() {
        return this.rule.named
    }

    get indexed() {
        return this.rule.indexed
    }

    static from(
        namedInput: NamedPropsInput,
        ...indexedInput: IndexedPropInput[]
    ) {
        const named: NamedPropRule[] = []
        for (const k in namedInput) {
            named.push({
                key: k,
                prerequisite: namedInput[k].prerequisite ?? false,
                optional: namedInput[k].optional ?? false,
                value: typeNodeFromInput(namedInput[k].value)
            })
        }
        const indexed: IndexedPropRule[] = indexedInput.map(
            ({ key, value }) => ({
                key: typeNodeFromInput(key) as TypeNode<string>,
                value: typeNodeFromInput(value)
            })
        )
        return new PropsNode({ named, indexed })
    }

    toString() {
        const entries = this.named.map((prop): [string, string] => {
            return [
                `${prop.key}${prop.optional ? "?" : ""}`,
                prop.value.toString()
            ]
        })
        for (const entry of this.indexed) {
            entries.push([`[${entry.key}]`, entry.value.toString()])
        }
        return JSON.stringify(fromEntries(entries))
    }

    compileTraverse(s: CompilationState) {
        return this.named
            .map((prop) =>
                prop.value
                    .compileTraverse(s)
                    .replaceAll(In, `${In}${compilePropAccess(prop.key)}`)
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
                                    key: k,
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
                            key: k,
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
        if (named.some((prop) => prop.key === "length" && prop.prerequisite)) {
            // if the index key is from and unbounded array and we have a tuple length,
            // it has already been intersected and should be removed
            indexed = indexed.filter(
                (entry) => !extractArrayIndexRegex(entry.key)
            )
        }
        return new PropsNode({ named, indexed })
    }

    pruneDiscriminant(path: string[], kind: DiscriminantKind): PropsNode {
        const [key, ...nextPath] = path
        const indexToPrune = this.named.findIndex((prop) => prop.key === key)
        if (indexToPrune === -1) {
            return throwInternalError(`Unexpectedly failed to prune key ${key}`)
        }
        const prunedValue = this.named[indexToPrune].value.pruneDiscriminant(
            nextPath,
            kind
        )
        const preserved = [...this.named]
        if (prunedValue === unknownTypeNode) {
            preserved.splice(indexToPrune, 1)
        } else {
            preserved[indexToPrune] = {
                ...preserved[indexToPrune],
                value: prunedValue
            }
        }
        return new PropsNode({ named: preserved, indexed: this.indexed })
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
        return this.named.map((prop) => prop.key)
    }
}

export const emptyPropsNode = new PropsNode([])

export type PropsInput = NamedPropsInput | PropsInputTuple

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends IndexedPropInput[] = IndexedPropInput[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Record<string, NamedPropInput>

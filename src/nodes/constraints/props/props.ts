import { throwInternalError } from "../../../utils/errors.js"
import type { evaluate } from "../../../utils/generics.js"
import type { List } from "../../../utils/lists.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { tryParseWellFormedInteger } from "../../../utils/numericLiterals.js"
import type { Key, mutable } from "../../../utils/records.js"
import { fromEntries, hasKeys } from "../../../utils/records.js"
import {
    type CompilationState,
    compilePropAccess,
    In,
    IndexIn
} from "../../compilation.js"
import type { DiscriminantKind } from "../../discriminate.js"
import type { DisjointsSources } from "../../disjoint.js"
import { Disjoint } from "../../disjoint.js"
import { defineNode } from "../../node.js"
import type { PredicateInput } from "../../predicate.js"
import type { inferTypeInput, TypeInput } from "../../type.js"
import {
    neverTypeNode,
    TypeNode,
    typeNodeFromInput,
    unknownTypeNode
} from "../../type.js"

export type PropsChildren = [NamedNodes, ...IndexedNodeEntry[]]

export class PropsNode extends defineNode<PropsChildren>()({
    kind: "props",
    condition: (n) => {
        // Sort keys first by precedence (prerequisite,required,optional),
        // then alphebetically by name (bar, baz, foo)
        const sortedNamedEntries = Object.entries(named).sort((l, r) => {
            const lPrecedence = precedenceByPropKind[l[1].kind]
            const rPrecedence = precedenceByPropKind[r[1].kind]
            return lPrecedence > rPrecedence
                ? 1
                : lPrecedence < rPrecedence
                ? -1
                : l[0] > r[0]
                ? 1
                : -1
        })
        indexed.sort((l, r) => (l[0].condition >= r[0].condition ? 1 : -1))
        const condition = PropsNode.compile(sortedNamedEntries, indexed)
        super("props", condition)
        this.namedEntries = sortedNamedEntries
    },
    describe: (n) => `props`,
    intersect: (l, r) => l
}) {
    get namedEntries() {
        return Object.entries(this.named)
    }

    get named() {
        return this.children[0]
    }

    get indexed() {
        const checks: string[] = []
        for (const k in named) {
            checks.push(PropsNode.compileNamedEntry([k, named[k]]))
        }
        for (const entry of indexed) {
            checks.push(PropsNode.compileIndexedEntry(entry))
        }
        return checks.join(" && ") || "true"
        return this.children.slice(1) as IndexedNodeEntry[]
    }

    // // TODO: standarize entry to a node
    // children: [NamedNodeEntry[], IndexedNodeEntry[]]

    static from(
        namedInput: NamedPropsInput,
        ...indexedInput: IndexedInputEntry[]
    ) {
        const named = {} as mutable<NamedNodes>
        for (const k in namedInput) {
            named[k] = {
                kind: namedInput[k].kind,
                value: typeNodeFromInput(namedInput[k].value)
            }
        }
        const indexed: IndexedNodeEntry[] = indexedInput.map(
            ([keyInput, valueInput]) => [
                TypeNode.from(keyInput),
                typeNodeFromInput(valueInput)
            ]
        )
        return new PropsNode(named, ...indexed)
    }

    toString() {
        const entries = this.namedEntries.map((entry): [string, string] => {
            const key = entry[0] + entry[1].kind === "optional" ? "?" : ""
            const value = entry[1].value.toString()
            return [key, value]
        })
        for (const entry of this.indexed) {
            entries.push([`[${entry[0].toString()}]`, entry[1].toString()])
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

    intersectNode(r: PropsNode) {
        let indexed = [...this.indexed]
        for (const [rKey, rValue] of r.indexed) {
            const matchingIndex = indexed.findIndex(([lKey]) => lKey === rKey)
            if (matchingIndex === -1) {
                indexed.push([rKey, rValue])
            } else {
                const result = indexed[matchingIndex][1].intersect(rValue)
                indexed[matchingIndex][1] =
                    result instanceof Disjoint ? neverTypeNode : result
            }
        }
        const named = { ...this.named, ...r.named }
        const disjointsByPath: DisjointsSources = {}
        for (const k in named) {
            // TODO: not all discriminatable- if one optional and one required, even if disjoint
            let intersectedValue: NamedNode | Disjoint = named[k]
            if (k in this.named) {
                if (k in r.named) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    intersectedValue = this.intersectNamedProp(k, r.named[k])
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const [rKey, rValue] of r.indexed) {
                        if (rKey.allows(k)) {
                            intersectedValue = this.intersectNamedProp(k, {
                                kind: "optional",
                                value: rValue
                            })
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const [lKey, lValue] of this.indexed) {
                    if (lKey.allows(k)) {
                        intersectedValue = r.intersectNamedProp(k, {
                            kind: "optional",
                            value: lValue
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
        if (named.length?.kind === "prerequisite") {
            // if the index key is from and unbounded array and we have a tuple length,
            // it has already been intersected and should be removed
            indexed = indexed.filter(
                (entry) => !extractArrayIndexRegex(entry[0])
            )
        }
        return new PropsNode(named, ...indexed)
    }

    pruneDiscriminant(path: string[], kind: DiscriminantKind): PropsNode {
        const [key, ...nextPath] = path
        const propAtKey = this.named[key]
        const prunedValue = propAtKey.value.pruneDiscriminant(nextPath, kind)
        const { [key]: _, ...preserved } = this.named
        if (prunedValue !== unknownTypeNode) {
            preserved[key] = {
                kind: propAtKey.kind,
                value: prunedValue
            }
        }
        return new PropsNode(preserved, ...this.indexed)
    }

    private _keyof?: TypeNode<Key>
    keyof() {
        if (this._keyof) {
            return this._keyof
        }
        this._keyof = this.namedKeyOf().or(this.indexedKeyOf())
        return this._keyof
    }

    indexedKeyOf() {
        return new TypeNode(
            ...this.indexed.flatMap((entry) => entry[0].children)
        ) as TypeNode<Key>
    }

    namedKeyOf() {
        return TypeNode.fromValue(...this.namedKeyLiterals()) as TypeNode<Key>
    }

    namedKeyLiterals() {
        return this.namedEntries.map((entry) => entry[0])
    }
}

const precedenceByPropKind = {
    prerequisite: 0,
    required: 1,
    optional: 2
} satisfies Record<PropKind, number>

export const emptyPropsNode = new PropsNode({})

export type PropsInput = NamedPropsInput | PropsInputTuple

export type PropsInputTuple<
    named extends NamedPropsInput = NamedPropsInput,
    indexed extends IndexedInputEntry[] = IndexedInputEntry[]
> = readonly [named: named, ...indexed: indexed]

export type NamedPropsInput = Record<string, NamedValueInput>

export type NamedNodes = Record<string, NamedNode>

export type IndexedInputEntry = readonly [
    keyType: PredicateInput<"string">,
    valueType: TypeInput
]

export type IndexedNodeEntry = [keyType: TypeNode<string>, valueType: TypeNode]

export type PropKind = "required" | "optional" | "prerequisite"

const arrayIndexMatcherSuffix = `(?:0|(?:[1-9]\\d*))$`

type ArrayIndexMatcherSource = `${string}${typeof arrayIndexMatcherSuffix}`

const excludedIndexMatcherStart = "^(?!("
const excludedIndexMatcherEnd = ")$)"

// Build a pattern to exclude all indices from firstVariadic - 1 down to 0
const excludedIndicesSource = (firstVariadic: number) => {
    if (firstVariadic < 1) {
        return throwInternalError(
            `Unexpectedly tried to create a variadic index < 1 (was ${firstVariadic})`
        )
    }
    let excludedIndices = `${firstVariadic - 1}`
    for (let i = firstVariadic - 2; i >= 0; i--) {
        excludedIndices += `|${i}`
    }
    return `${excludedIndexMatcherStart}${excludedIndices}${excludedIndexMatcherEnd}${arrayIndexMatcherSuffix}` as const
}

type VariadicIndexMatcherSource = ReturnType<typeof excludedIndicesSource>

const nonVariadicIndexMatcherSource = `^${arrayIndexMatcherSuffix}` as const

type NonVariadicIndexMatcherSource = typeof nonVariadicIndexMatcherSource

export const createArrayIndexMatcher = <index extends number>(
    firstVariadic: index
) =>
    (firstVariadic === 0
        ? // If the variadic pattern starts at index 0, return the base array index matcher
          nonVariadicIndexMatcherSource
        : excludedIndicesSource(firstVariadic)) as index extends 0
        ? NonVariadicIndexMatcherSource
        : VariadicIndexMatcherSource

const extractArrayIndexRegex = (keyNode: TypeNode<string>) => {
    if (keyNode.children.length !== 1) {
        return
    }
    const regexNode = keyNode.children[0].getConstraint("regex")
    if (!regexNode || regexNode.children.length !== 1) {
        return
    }
    const source = regexNode.children[0]
    if (!source.endsWith(arrayIndexMatcherSuffix)) {
        return
    }
    return source as ArrayIndexMatcherSource
}

const extractFirstVariadicIndex = (source: ArrayIndexMatcherSource) => {
    if (!source.startsWith(excludedIndexMatcherStart)) {
        return 0
    }
    const excludedIndices = source.slice(
        excludedIndexMatcherStart.length,
        source.indexOf(excludedIndexMatcherEnd)
    )
    const firstExcludedIndex = excludedIndices.split("|")[0]
    return (
        tryParseWellFormedInteger(
            firstExcludedIndex,
            `Unexpectedly failed to parse a variadic index from ${source}`
        ) + 1
    )
}

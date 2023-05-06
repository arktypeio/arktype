import { throwInternalError } from "../utils/errors.js"
import { isArray } from "../utils/objectKinds.js"
import type { mutable } from "../utils/records.js"
import { hasKeys } from "../utils/records.js"
import {
    type CompilationState,
    compilePropAccess,
    In,
    IndexIn
} from "./compilation.js"
import type { DiscriminantKind } from "./discriminate.js"
import type { DisjointsSources } from "./disjoint.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import type { PredicateNodeInput } from "./predicate.js"
import type { TypeNodeInput } from "./type.js"
import {
    arrayIndexTypeNode,
    neverTypeNode,
    TypeNode,
    unknownTypeNode
} from "./type.js"

export class PropsNode extends Node<"props"> {
    static readonly kind = "props"

    named: NamedProps
    indexed: IndexedProps

    constructor([named, indexed]: [named: NamedProps, indexed: IndexedProp[]]) {
        super(PropsNode, named, indexed)
        this.named = named
        this.indexed = indexed
    }

    static from(
        namedInput: NamedPropsInput,
        ...indexedInput: IndexedPropsInput
    ) {
        const named = {} as mutable<NamedProps>
        for (const k in namedInput) {
            named[k] = {
                kind: namedInput[k].kind,
                value: typeNodeFromPropInput(namedInput[k].value)
            }
        }
        const indexed: IndexedProps = indexedInput.map(
            ([keyInput, valueInput]) => [
                typeNodeFromPropInput(keyInput),
                typeNodeFromPropInput(valueInput)
            ]
        )
        return new PropsNode([named, indexed])
    }

    static compile(named: NamedProps, indexed: IndexedProps) {
        const checks: string[] = []
        const names = Object.keys(named).sort()
        for (const k of names) {
            checks.push(this.#compileNamedProp(k, named[k]))
        }
        if (indexed.length) {
            if (indexed.length === 1 && indexed[0][0] === arrayIndexTypeNode) {
                checks.push(PropsNode.#compileArray(indexed[0][1]))
            } else {
                return throwInternalError(`Unexpected index types`)
            }
        }
        return checks.join(" && ") || "true"
    }

    static #compileNamedProp(k: string, prop: NamedProp) {
        const valueCheck = prop.value.key.replaceAll(
            In,
            `${In}${compilePropAccess(k)}`
        )
        return prop.kind === "optional"
            ? `!('${k}' in ${In}) || ${valueCheck}`
            : valueCheck
    }

    static #compileArray(elementType: TypeNode) {
        const elementCondition = elementType.key
            .replaceAll(IndexIn, `${IndexIn}Inner`)
            .replaceAll(In, `${In}[${IndexIn}]`)
        const result = `(() => {
            let valid = true;
            for(let ${IndexIn} = 0; ${IndexIn} < ${In}.length; ${IndexIn}++) {
                valid = ${elementCondition} && valid;
            }
            return valid
        })()`
        return result
    }

    compileTraverse(s: CompilationState) {
        return Object.keys(this.named)
            .sort()
            .map((k) =>
                this.named[k].value
                    .compileTraverse(s)
                    .replaceAll(In, `${In}${compilePropAccess(k)}`)
            )
            .join("\n")
    }

    static intersect(l: PropsNode, r: PropsNode) {
        const indexed = [...l.indexed]
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
        const named = { ...l.named, ...r.named }
        const disjointsByPath: DisjointsSources = {}
        for (const k in named) {
            // TODO: not all discriminatable- if one optional and one required, even if disjoint
            let intersectedValue: NamedProp | Disjoint = named[k]
            if (k in l.named) {
                if (k in r.named) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    intersectedValue = PropsNode.#intersectNamedProp(
                        l.named[k],
                        r.named[k]
                    )
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const [rKey, rValue] of r.indexed) {
                        if (rKey.allows(k)) {
                            intersectedValue = PropsNode.#intersectNamedProp(
                                l.named[k],
                                {
                                    kind: "optional",
                                    value: rValue
                                }
                            )
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const [lKey, lValue] of l.indexed) {
                    if (lKey.allows(k)) {
                        intersectedValue = PropsNode.#intersectNamedProp(
                            r.named[k],
                            {
                                kind: "optional",
                                value: lValue
                            }
                        )
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
        return hasKeys(disjointsByPath)
            ? new Disjoint(disjointsByPath)
            : new PropsNode([named, indexed])
    }

    static #intersectNamedProp(
        l: NamedProp,
        r: NamedProp
    ): NamedProp | Disjoint {
        const kind =
            l.kind === "prerequisite" || r.kind === "prerequisite"
                ? "prerequisite"
                : l.kind === "required" || r.kind === "required"
                ? "required"
                : "optional"
        const result = l.value.intersect(r.value)
        if (result instanceof Disjoint) {
            if (kind === "optional") {
                return {
                    kind: "optional",
                    value: neverTypeNode
                }
            }
            return result
        }
        return {
            kind,
            value: result
        }
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
        return new PropsNode([preserved, this.indexed])
    }
}

export const emptyPropsNode = new PropsNode([{}, []])

export type PropsInput =
    | NamedPropsInput
    | [named: NamedPropsInput, ...indexed: IndexedPropInput[]]

export type NamedPropInput = {
    kind: PropKind
    value: PropTypeInput
}

export type NamedPropsInput = Record<string, NamedPropInput>

export type NamedProp = {
    kind: PropKind
    value: TypeNode
}

export type NamedProps = Record<string, NamedProp>

export type IndexedPropInput = [
    keyType: PropTypeInput,
    valueType: PropTypeInput
]

export type IndexedPropsInput = IndexedPropInput[]

export type IndexedProp = [keyType: TypeNode, valueType: TypeNode]

export type IndexedProps = IndexedProp[]

export type PropKind = "required" | "optional" | "prerequisite"

export type PropTypeInput = TypeNode | TypeNodeInput | PredicateNodeInput

const typeNodeFromPropInput = (input: PropTypeInput) =>
    input instanceof TypeNode
        ? input
        : isArray(input)
        ? TypeNode.from(...input)
        : TypeNode.from(input)

// const keysOfPredicate = (kind: Domain, predicate: Predicate) =>
//     domain !== "object" || predicate === true
//         ? baseKeysByDomain[domain]
//         : sharedKeysOf(
//               listFrom(predicate).map((branch) => keysOfObjectBranch(branch))
//           )

// const sharedKeysOf = (keyBranches: List<KeyValue>[]): List<KeyValue> => {
//     if (!keyBranches.length) {
//         return []
//     }
//     let sharedKeys = keyBranches[0]
//     for (let i = 1; i < keyBranches.length; i++) {
//         // we can filter directly by equality here because the RegExp we're
//         // using will always be reference equal to
//         // wellFormedNonNegativeIntegerMatcher
//         sharedKeys = sharedKeys.filter((k) => keyBranches[i].includes(k))
//     }
//     return sharedKeys
// }

// const keysOfObjectBranch = (branch: BranchDefinition<"object">): KeyValue[] => {
//     const result: KeyValue[] = []
//     if ("props" in branch) {
//         for (const key of Object.keys(branch.props)) {
//             if (key === mappedKeys.index) {
//                 // if any number is a valid key push this RegExp
//                 result.push(wellFormedNonNegativeIntegerMatcher)
//             } else if (!result.includes(key)) {
//                 result.push(key)
//                 if (wellFormedNonNegativeIntegerMatcher.test(key)) {
//                     // allow numeric access to keys
//                     result.push(
//                         tryParseWellFormedInteger(
//                             key,
//                             `Unexpectedly failed to parse an integer from key '${key}'`
//                         )
//                     )
//                 }
//             }
//         }
//     }
//     if ("instance" in branch) {
//         for (const key of prototypeKeysOf(branch.instance.prototype)) {
//             if (!result.includes(key)) {
//                 result.push(key)
//             }
//         }
//     }
//     return result
// }

import { throwInternalError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { HomogenousTuple } from "../utils/lists.js"
import { wellFormedNonNegativeIntegerMatcherSource } from "../utils/numericLiterals.js"
import { isArray } from "../utils/objectKinds.js"
import type { Key, mutable } from "../utils/records.js"
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
import type { inferTypeInput, TypeInput } from "./type.js"
import {
    neverTypeNode,
    numericArrayIndexTypeNode,
    TypeNode,
    unknownTypeNode
} from "./type.js"

export class PropsNode extends Node<"props"> {
    static readonly kind = "props"

    named: NamedNodes
    indexed: IndexedNodeEntry[]

    constructor([named, indexed]: [
        named: NamedNodes,
        indexed: IndexedNodeEntry[]
    ]) {
        super(PropsNode, named, indexed)
        this.named = named
        this.indexed = indexed
    }

    static from(namedInput: NamedInput, ...indexedInput: IndexedInputEntry[]) {
        const named = {} as mutable<NamedNodes>
        for (const k in namedInput) {
            named[k] = {
                kind: namedInput[k].kind,
                value: typeNodeFromPropInput(namedInput[k].value)
            }
        }
        const indexed: IndexedNodeEntry[] = indexedInput.map(
            ([keyInput, valueInput]) => [
                typeNodeFromPropInput(keyInput),
                typeNodeFromPropInput(valueInput)
            ]
        )
        return new PropsNode([named, indexed])
    }

    static compile(named: NamedNodes, indexed: IndexedNodeEntry[]) {
        const checks: string[] = []
        const names = Object.keys(named).sort()
        for (const k of names) {
            checks.push(this.#compileNamedProp(k, named[k]))
        }
        if (indexed.length) {
            if (
                indexed.length === 1 &&
                indexed[0][0] === numericArrayIndexTypeNode
            ) {
                checks.push(PropsNode.#compileArray(indexed[0][1]))
            } else {
                return throwInternalError(`Unexpected index types`)
            }
        }
        return checks.join(" && ") || "true"
    }

    static #compileNamedProp(k: string, prop: NamedNode) {
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
            let intersectedValue: NamedNode | Disjoint = named[k]
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
        l: NamedNode,
        r: NamedNode
    ): NamedNode | Disjoint {
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

export type PropsInput = NamedInput | PropsInputTuple

export type PropsInputTuple<
    named extends NamedInput = NamedInput,
    indexed extends IndexedInputEntry[] = IndexedInputEntry[]
> = [named: named, ...indexed: indexed]

export type NamedPropInput = {
    kind: PropKind
    value: TypeInput
}

export type NamedInput = Record<string, NamedPropInput>

export type NamedNode = {
    kind: PropKind
    value: TypeNode
}

export type NamedNodes = Record<string, NamedNode>

export type IndexedInputEntry = [keyType: TypeInput, valueType: TypeInput]

export type IndexedNodeEntry = [keyType: TypeNode, valueType: TypeNode]

export type PropKind = "required" | "optional" | "prerequisite"

export const arrayIndexInput = {
    basis: "string",
    regex: wellFormedNonNegativeIntegerMatcherSource
} as const

type ArrayIndexInput = typeof arrayIndexInput

type inferNamedProps<input extends NamedInput> = {} extends input
    ? unknown
    : // Avoid iterating over prototype keys of tuple
    [keyof input, input] extends ["length", TupleLengthProps]
    ? unknown
    : evaluate<
          {
              [k in requiredKeyOf<input>]: inferTypeInput<input[k]["value"]>
          } & {
              [k in optionalKeyOf<input>]?: inferTypeInput<input[k]["value"]>
          }
      >

type TupleLengthProps<length extends number = number> = {
    length: {
        kind: "prerequisite"
        value: { basis: ["===", length] }
    }
}

export type inferPropsInput<input extends PropsInput> =
    input extends PropsInputTuple<infer named, infer indexed>
        ? inferNamedAndIndexed<named, indexed>
        : input extends NamedInput
        ? inferNamedProps<input>
        : never

type inferNamedAndIndexed<
    named extends NamedInput,
    entries extends unknown[],
    result = inferNamedProps<named>
> = entries extends [infer entry extends IndexedInputEntry, ...infer tail]
    ? inferNamedAndIndexed<
          named,
          tail,
          result &
              (entry[0] extends ArrayIndexInput
                  ? inferArray<named, entry[1]>
                  : Record<
                        Extract<inferTypeInput<entry[0]>, Key>,
                        inferTypeInput<entry[1]>
                    >)
      >
    : result

type inferArray<
    named extends NamedInput,
    elementDef extends TypeInput
> = named extends TupleLengthProps<infer length>
    ? HomogenousTuple<inferTypeInput<elementDef>, length>
    : inferTypeInput<elementDef>[]

type requiredKeyOf<input extends NamedInput> = Exclude<
    keyof input,
    optionalKeyOf<input>
>

type optionalKeyOf<input extends NamedInput> = {
    [k in keyof input]: input[k]["kind"] extends "optional" ? k : never
}[keyof input]

const typeNodeFromPropInput = (input: TypeInput) =>
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

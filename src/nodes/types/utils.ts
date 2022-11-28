import type { ScopeRoot } from "../../scope.js"
import type { defined, mutable, stringKeyOf } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { Comparison } from "../node.js"

export type UnfinalizedComparison<attributes> = [
    leftExclusive: mutable<attributes>,
    intersection: mutable<attributes> | null,
    rightExclusive: mutable<attributes>
]

export const initializeComparison = <attributes extends dict>() =>
    [{}, {}, {}] as UnfinalizedComparison<attributes>

export type Subcomparison<t> = [
    leftExclusive: mutable<t>,
    intersection: mutable<t>,
    rightExclusive: mutable<t>
]

export const initializeSubcomparison = <t>() => [{}, {}, {}] as Subcomparison<t>

export type Subcompare<attributes extends dict> = (
    l: attributes,
    r: attributes,
    root: UnfinalizedComparison<attributes>,
    scope: ScopeRoot
) => void

export type RawSubcompare<
    attributes extends dict,
    k extends keyof attributes
> = (
    l: defined<attributes[k]>,
    r: defined<attributes[k]>,
    scope: ScopeRoot
) => Comparison<attributes[k]>

export const createSubcomparison =
    <attributes extends dict, k extends stringKeyOf<attributes>>(
        k: k,
        subcompareDefined: RawSubcompare<attributes, k>
    ): Subcompare<attributes> =>
    (l, r, root, scope) => {
        if (l === undefined) {
            if (r !== undefined) {
                root[2][k] = r[k]
                if (root[1] !== null) {
                    root[1][k] = r[k]
                }
            }
        } else if (r === undefined) {
            root[0][k] = l[k]
            if (root[1] !== null) {
                root[1][k] = l[k]
            }
        } else {
            const result = subcompareDefined(l[k] as any, r as any, scope)
            if (result[0]) {
                root[0][k] = result[0]
            }
            if (result[2]) {
                root[2][k] = result[2]
            }
            if (root[1] !== null) {
                if (result[1] === null) {
                    root[1] = null
                } else {
                    root[1][k] = result[1]
                }
            }
        }
    }

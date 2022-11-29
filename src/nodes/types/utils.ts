import type { ScopeRoot } from "../../scope.js"
import type { defined, mutable, stringKeyOf } from "../../utils/generics.js"
import { hasKeys } from "../../utils/generics.js"
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

type SubcompareArgs<
    attributes extends dict,
    requiresScope extends boolean
> = requiresScope extends true
    ? [
          result: UnfinalizedComparison<attributes>,
          l: attributes,
          r: attributes,
          scope: ScopeRoot
      ]
    : [result: UnfinalizedComparison<attributes>, l: attributes, r: attributes]

type RawSubcompareArgs<
    attributes extends dict,
    k extends keyof attributes,
    requiresScope extends boolean
> = requiresScope extends true
    ? [l: defined<attributes[k]>, r: defined<attributes[k]>, scope: ScopeRoot]
    : [l: defined<attributes[k]>, r: defined<attributes[k]>, scope?: undefined]

export const createSubcomparison =
    <
        attributes extends dict,
        k extends stringKeyOf<attributes>,
        requiresScope extends boolean = false
    >(
        k: k,
        subcompareDefined: (
            ...arg: RawSubcompareArgs<attributes, k, requiresScope>
        ) => Comparison<attributes[k]>
    ) =>
    (...args: SubcompareArgs<attributes, requiresScope>) => {
        const [result, l, r, scope] = args
        if (l[k] === undefined) {
            if (r[k] !== undefined) {
                result[2][k] = r[k]
                if (result[1] !== null) {
                    result[1][k] = r[k]
                }
            }
        } else if (r[k] === undefined) {
            result[0][k] = l[k]
            if (result[1] !== null) {
                result[1][k] = l[k]
            }
        } else {
            const subresult = subcompareDefined(
                l[k] as any,
                r[k] as any,
                scope as any
            )
            if (subresult[0]) {
                result[0][k] = subresult[0]
            }
            if (subresult[2]) {
                result[2][k] = subresult[2]
            }
            if (result[1] !== null) {
                if (subresult[1] === null) {
                    result[1] = null
                } else {
                    result[1][k] = subresult[1]
                }
            }
        }
    }

export const nullifyEmpty = <t>(result: t): t | null =>
    hasKeys(result) ? result : null

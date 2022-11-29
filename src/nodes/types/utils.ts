import type { ScopeRoot } from "../../scope.js"
import type { defined, mutable, stringKeyOf } from "../../utils/generics.js"
import { hasKeys } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { Never } from "./degenerate.js"
import { isNever } from "./degenerate.js"

type UnwrappedIntersectionForKey<
    t,
    config extends KeyIntersectionConfig,
    result extends Never | t = config["neverable"] extends true ? Never | t : t
> = config["scoped"] extends true
    ? (l: t, r: t, scope: ScopeRoot) => result
    : (l: t, r: t) => result

type WrappedIntersectionForKey<
    attributes extends dict,
    config extends KeyIntersectionConfig,
    result extends Never | attributes = config["neverable"] extends true
        ? Never | attributes
        : attributes
> = config["scoped"] extends true
    ? (
          result: attributes,
          l: attributes,
          r: attributes,
          scope: ScopeRoot
      ) => result
    : (result: attributes, l: attributes, r: attributes) => result

type KeyIntersectionConfig = {
    scoped?: boolean
    neverable?: boolean
}

type CreateIntersectionForKey = <
    attributes extends dict,
    k extends stringKeyOf<attributes>,
    config extends KeyIntersectionConfig = {}
>(
    k: k,
    f: UnwrappedIntersectionForKey<defined<attributes[k]>, config>
) => WrappedIntersectionForKey<attributes, config>

export type AttributesIntersection<attributes extends dict> = (
    l: attributes,
    r: attributes
) => attributes | Never

export type ScopedAttributesIntersection<attributes extends dict> = (
    l: attributes,
    r: attributes,
    scope: ScopeRoot
) => attributes | Never

export const createIntersectionForKey: CreateIntersectionForKey =
    (k, f) => (result: mutable<dict>, l: dict, r: dict, scope?: ScopeRoot) => {
        if (l[k] === undefined || r[k] === undefined) {
            result[k] = l[k] ?? r[k]
        } else {
            const intersection = f(l[k] as any, r[k] as any, scope as any)
            if (isNever(intersection)) {
                return intersection as any
            }
        }
    }

export const nullifyEmpty = <t>(result: t): t | null =>
    hasKeys(result) ? result : null

export const createNonOverlappingNever = (l: unknown, r: unknown): Never => ({
    never: `${JSON.stringify(l)} and ${JSON.stringify(r)} have no overlap`
})

import type { defined, stringKeyOf } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { UnfinalizedComparison } from "../node.js"

export const initializeComparison = <t extends dict>() =>
    [{}, {}, {}] as UnfinalizedComparison<t>

export type Subcompare<attributes extends dict, k extends keyof attributes> = (
    l: attributes[k],
    r: attributes[k],
    root: UnfinalizedComparison<attributes>
) => void

export type DefinedSubcompare<
    attributes extends dict,
    k extends keyof attributes
> = (
    l: defined<attributes[k]>,
    r: defined<attributes[k]>,
    root: UnfinalizedComparison<attributes>
) => void

export const createSubcomparison =
    <attributes extends dict, k extends stringKeyOf<attributes>>(
        k: k,
        subcompareDefined: DefinedSubcompare<attributes, k>
    ): Subcompare<attributes, k> =>
    (l, r, root) => {
        if (l === undefined) {
            if (r !== undefined) {
                root[1][k] = r
                root[2][k] = r
            }
        } else if (r === undefined) {
            root[0][k] = l
            root[1][k] = l
        } else {
            subcompareDefined(l as any, r as any, root)
        }
    }

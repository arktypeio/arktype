import type { ScopeRoot } from "../scope.js"
import type { Dictionary, keySet, mutable } from "../utils/generics.js"
import { hasKeys, keyCount } from "../utils/generics.js"
import { tryParseWellFormedNumber } from "../utils/numericLiterals.js"
import type { ObjectTypeName } from "../utils/typeOf.js"
import { hasObjectType } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"
import { checkNode } from "./check.js"
import type { IntersectionReducer } from "./intersection.js"
import { composeKeyedIntersection, intersection } from "./intersection.js"
import type { Node } from "./node.js"
import { propsIntersection, requiredKeysIntersection } from "./props.js"

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}

export type BaseAttributes = {
    readonly props?: Dictionary<Node>
    readonly requiredKeys?: keySet
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectTypeName
    readonly bounds?: Bounds
}

const rawObjectIntersection = composeKeyedIntersection<BaseAttributes>({
    subtype: (l, r) => (l === r ? undefined : null),
    props: propsIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection,
    requiredKeys: requiredKeysIntersection
})

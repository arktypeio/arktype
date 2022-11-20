import type { DynamicScope } from "../../../scope.js"
import type { requireKeys } from "../../../utils/generics.js"
import { parseDefinition } from "../../definition.js"
import type { Attributes } from "./attributes.js"
import { intersect } from "./intersect.js"
import { pruneAttribute } from "./union/prune.js"

export const expandAlias = (
    attributes: requireKeys<Attributes, "alias">,
    scope: DynamicScope
) =>
    intersect(
        attributes,
        resolveAlias(pruneAttribute(attributes, "alias")!, scope),
        scope
    )

const resolveAlias = (name: string, scope: DynamicScope) => {
    const cache = scope.$.parseCache
    const cachedAttributes = cache.get(name)
    if (!cachedAttributes) {
        // Set the resolution to a shallow reference until the alias has
        // been fully parsed in case it cyclicly references itself
        cache.set(name, { alias: name })
        cache.set(name, parseDefinition(scope.$.aliases[name], scope))
    }
    return cache.get(name)!
}

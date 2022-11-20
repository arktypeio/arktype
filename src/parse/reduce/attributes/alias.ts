import type { DynamicScope } from "../../../scope.js"
import { parseDefinition } from "../../definition.js"
import type { Attributes } from "./attributes.js"
import { intersect } from "./intersect.js"
import { pruneAttribute } from "./union/prune.js"

export const expandAliases = (attributes: Attributes, scope: DynamicScope) => {
    const aliasA = pruneAttribute(attributes, "alias")
    if (aliasA) {
        intersect(attributes, resolveAlias(aliasA, scope), scope)
    }
}

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

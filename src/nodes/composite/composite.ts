import { Disjoint } from "../disjoint.js"
import type {
    BaseNode,
    BaseNodeConfig,
    BaseNodeImplementation,
    NodeExtensions
} from "../node.js"
import { defineNode } from "../node.js"
import type { TypeNode } from "./type.js"

export interface CompositeNodeImplementation<node extends CompositeNode>
    extends BaseNodeImplementation<node> {
    getReferences: (children: node["rule"]) => TypeNode[]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (input: node["input"]) => node["rule"]
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

export interface CompositeNodeConfig extends BaseNodeConfig {
    input: unknown
    rule: this["input"]
}

export type defineComposite<config extends CompositeNodeConfig> = config

const intersectionCache: Record<string, BaseNode | Disjoint> = {}

export const defineComposite = <node extends CompositeNode>(
    def: CompositeNodeImplementation<node>,
    extension: NodeExtensions<node>
) =>
    defineNode(def, (base) => {
        const instance = extension(base)
        return Object.assign(instance, {
            references: def.getReferences(base.rule),
            intersect: (other) => {
                if (instance === other) {
                    return instance
                }
                const cacheKey = `${def.kind}${base.source}${other.source}`
                if (intersectionCache[cacheKey]) {
                    return intersectionCache[cacheKey]
                }
                const result: BaseNode | Disjoint = def.intersect(
                    instance,
                    other
                )
                intersectionCache[cacheKey] = result
                intersectionCache[`${def.kind}${other.source}${base.source}`] =
                    // also cache the result with other's source as the key.
                    // if it was a Disjoint, it has to be inverted so that l, r
                    // still line up correctly
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        })
    })

export interface CompositeNode<
    config extends CompositeNodeConfig = CompositeNodeConfig
> extends BaseNode<config> {
    references: TypeNode[]
    intersect(other: this): this["rule"] | Disjoint
}

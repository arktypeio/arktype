import { Disjoint } from "../disjoint.js"
import type {
    BaseNode,
    BaseNodeConfig,
    BaseNodeImplementation,
    basePropsOf,
    extendedPropsOf
} from "../node.js"
import { defineNode } from "../node.js"
import type { TypeNode } from "./type.js"

export interface CompositeNodeImplementation<node extends CompositeNode>
    extends BaseNodeImplementation<node> {
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (input: node["input"], meta: node["meta"]) => node["rule"]
    getReferences: (rule: node["rule"]) => TypeNode[]
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
    extension: (
        base: basePropsOf<node>
    ) => extendedPropsOf<node, "references" | "intersect" | "input">
) => {
    const createNode = defineNode(def, (base) => {
        const compositeBase = Object.assign(base, {
            references: def.getReferences(base.rule),
            intersect: (other: node) => {
                if (instance === other) {
                    return instance
                }
                const cacheKey = `${def.kind}${base.source}${other.source}`
                if (intersectionCache[cacheKey]) {
                    return intersectionCache[cacheKey]
                }
                const result = def.intersect(instance, other) as node | Disjoint
                intersectionCache[cacheKey] = result
                intersectionCache[`${def.kind}${other.source}${base.source}`] =
                    // also cache the result with other's source as the key.
                    // if it was a Disjoint, it has to be inverted so that l, r
                    // still line up correctly
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        })
        const instance = Object.assign(
            extension(compositeBase),
            compositeBase
        ) as node
        return instance
    })
    // TODO: better way to handle input
    return (input: node["input"], meta: node["meta"]) => {
        const result = createNode(def.parse(input, meta), meta)
        result.input = input
        return result
    }
}

export interface CompositeNode<
    config extends CompositeNodeConfig = CompositeNodeConfig
> extends BaseNode<config> {
    input: config["input"]
    references: TypeNode[]
    intersect(other: this): this | Disjoint
}

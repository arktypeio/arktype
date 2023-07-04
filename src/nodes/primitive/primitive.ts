import type { listable } from "../../../dev/utils/src/main.js"
import type { Disjoint } from "../disjoint.js"
import type { PrimitiveNodeKind } from "../kinds.js"
import { type BaseNode, type BaseNodeConfig } from "../node.js"

export interface PrimitiveNodeConfig extends BaseNodeConfig {
    kind: PrimitiveNodeKind
    intersectionGroup: listable<this["rule"]>
}

export type definePrimitive<config extends PrimitiveNodeConfig> = config

export type PrimitiveIntersection<config extends PrimitiveNodeConfig> = (
    l: config["intersectionGroup"],
    r: config["intersectionGroup"]
) => config["intersectionGroup"] | Disjoint

export interface PrimitiveNode<
    config extends PrimitiveNodeConfig = PrimitiveNodeConfig
> extends BaseNode<config> {}

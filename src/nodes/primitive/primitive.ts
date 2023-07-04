import type { listable } from "../../../dev/utils/src/main.js"
import type { PrimitiveNodeKind } from "../kinds.js"
import { type BaseNode, type BaseNodeConfig } from "../node.js"

export interface PrimitiveNodeConfig extends BaseNodeConfig {
    kind: PrimitiveNodeKind
    intersection: listable<this["rule"]>
}

export type definePrimitive<config extends PrimitiveNodeConfig> = config

// // if a single constraint is valid, allow it to be passed on its own as input
// type extractInputFormats<constraints extends BaseConstraints> =
//     constraints["length"] extends 1
//         ? constraints[0]["rule"]
//         : number extends constraints["length"]
//         ? listable<constraints[number]["rule"]>
//         : // if the number of constraints is a literal but not 1, map them to preserve the corresponding rule types
//           { [i in keyof constraints]: constraints[i]["rule"] }

export interface PrimitiveNode<
    config extends PrimitiveNodeConfig = PrimitiveNodeConfig
> extends BaseNode<config> {}

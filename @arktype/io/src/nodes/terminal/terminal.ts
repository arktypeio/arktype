import { Base } from "../base.js"
import type { TraversalState } from "../traversal/traversal.js"

export namespace Terminal {
    export abstract class Node extends Base.Node {
        children: undefined
        definitionRequiresStructure = false

        abstract readonly definition: string

        traverse(
            state: TraversalState
        ): state is TraversalState<InferPostcondition<this>> {
            if (this.precondition?.traverse(state) === false) {
                return false
            }
            if (!this.allows(state.data)) {
                state.errors.push()
                return false
            }
            return true
        }

        precondition?: Node

        abstract allows(
            data: InferPrecondition<this>
        ): data is InferPrecondition<this>

        toString() {
            return this.definition
        }

        get ast() {
            return this.definition
        }
    }

    type InferPrecondition<node extends Node> = node extends {
        precondition: infer precondition
    }
        ? InferPostcondition<precondition>
        : unknown

    type InferPostcondition<node> = node extends {
        allows: (data: any) => data is infer T
    }
        ? T
        : never

    // Original is here:
    // type InferPrecondition<node extends Node> = node["precondition"] extends {
    //     definition: Keyword.Definition
    // }
    //     ? Keyword.Infer<node["precondition"]["definition"]>
    //     : unknown
}

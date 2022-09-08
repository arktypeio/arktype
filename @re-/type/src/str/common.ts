import { Iterate } from "@re-/tools"
import * as Node from "../node/exports.js"
export * as Node from "../node/exports.js"

export type NodeToString<
    Node,
    Result extends string = ""
> = Node extends Iterate<infer Next, infer Rest>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrNode = string | number | StrNode[]

export type strNode = Node.base & { tree: StrNode }

export class constraints<Value> extends Array<constraint<unknown, Value>> {
    check(args: Node.Allows.Args<Value>) {
        for (const constraint of this) {
            constraint.check(args)
        }
    }
}

export abstract class constraint<Def, Value> {
    constructor(public definition: Def, public description: string) {}

    abstract check(args: Node.Allows.Args<Value>): void
}

export type constrainable<c extends constraint<unknown, unknown>> = {
    constraints: c[]
}

export type constrainableNode<c extends constraint<unknown, unknown>> =
    strNode & constrainable<c>

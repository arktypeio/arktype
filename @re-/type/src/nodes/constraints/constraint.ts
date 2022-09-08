export class constraints<Value> extends Array<constraint<unknown, Value>> {
    check(args: Node.Allows.Args<Value>) {
        for (const constraint of this) {
            constraint.check(args)
        }
    }
}

export abstract class constraint<Def, Value> {
    constructor(public definition: Def) {}

    abstract check(args: Node.Allows.Args<Value>): void
}

export type constrainable<c extends constraint<unknown, unknown>> = {
    constraints: c[]
}

export type constrainableNode<c extends constraint<unknown, unknown>> =
    strNode & constrainable<c>

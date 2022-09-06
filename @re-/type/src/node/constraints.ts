import { Allows } from "./exports.js"

export class constraints<Value> extends Array<constraint<unknown, Value>> {
    check(args: Allows.Args<Value>) {
        for (const constraint of this) {
            constraint.check(args)
        }
    }
}

export abstract class constraint<Def, Value> {
    constructor(public definition: Def, public description: string) {}

    abstract check(args: Allows.Args<Value>): void
}

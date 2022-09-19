import type { Allows } from "../allows.js"
import { Base } from "../base.js"
import { Create } from "../create.js"

export type IoParameters<In, Out> = [
    In: In,
    Out: Out,
    Map: IoMapFn<unknown, unknown>
]

export type IoMapFn<In, Out> = (input: In) => Out

export class io extends Base.node {
    In: Base.node
    Out: Base.node
    Map: IoMapFn<unknown, unknown>

    constructor(
        params: IoParameters<Base.node, Base.node>,
        private ctx: Base.context
    ) {
        super()
        this.In = params[0]
        this.Out = params[1]
        this.Map = params[2]
    }

    check(args: Allows.Args) {
        this.Out.check(args)
    }

    from(data: unknown, args: Allows.Args) {
        this.In.check(args)
        if (args.diagnostics.length) {
            throw new Error(args.diagnostics.summary)
        }
        const out = this.Map(args.data)
        // TODO: Option for whether to validate out
        this.Out.check({ ...args, data: out })
        if (args.diagnostics.length) {
            throw new Error(args.diagnostics.summary)
        }
        return out
    }
}

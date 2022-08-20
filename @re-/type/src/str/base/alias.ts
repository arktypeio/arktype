import { WithPropValue } from "@re-/tools"
import { Node } from "../../common.js"
import { TerminalNode } from "../../node/terminal.js"
import { Root } from "../../root.js"

export namespace AliasType {
    export type Infer<
        Def extends keyof Ctx["dict"],
        Ctx extends Node.InferenceContext
    > = "onResolve" extends keyof Ctx["meta"]
        ? Def extends "$resolution"
            ? BaseOf<Def, Ctx>
            : OnResolveOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["meta"]
        ? Def extends keyof Ctx["seen"]
            ? OnCycleOf<Def, Ctx>
            : BaseOf<Def, Ctx>
        : BaseOf<Def, Ctx>

    type BaseOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<Ctx["dict"][Def], Ctx & { seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["meta"]["onResolve"],
        {
            dict: WithPropValue<Ctx["dict"], "$resolution", Ctx["dict"][Def]>
            meta: Ctx["meta"]
            seen: Ctx["seen"] & { [K in Def]: true }
        }
    >

    type OnCycleOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["meta"]["onCycle"],
        {
            dict: WithPropValue<Ctx["dict"], "$cyclic", Ctx["dict"][Def]>
            meta: Ctx["meta"]
            seen: {}
        }
    >
}

export class AliasNode extends TerminalNode {
    static matches(def: string, ctx: Node.Context) {
        return !!ctx.space && def in ctx.space.dictionary
    }

    constructor(def: string, private ctx: Node.Context) {
        super(def)
    }

    get resolution() {
        return this.ctx.space!.resolutions[this.def]
    }

    allows(args: Node.Allows.Args): boolean {
        return this.resolution.allows(args)
    }

    create(args: Node.Create.Args): unknown {
        return this.resolution.create(args)
    }
}

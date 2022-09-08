import { WithPropValue } from "@re-/tools"
import { Root } from "../../../../root.js"
import { Node, terminalNode } from "../../../parser/operand/common.js"

export namespace Alias {
    export type Infer<
        Def extends keyof Ctx["Dict"],
        Ctx extends Node.InferenceContext
    > = "onResolve" extends keyof Ctx["Meta"]
        ? Def extends "$resolution"
            ? BaseOf<Def, Ctx>
            : OnResolveOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["Meta"]
        ? Def extends keyof Ctx["Seen"]
            ? OnCycleOf<Def, Ctx>
            : BaseOf<Def, Ctx>
        : BaseOf<Def, Ctx>

    type BaseOf<
        Def extends keyof Ctx["Dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<Ctx["Dict"][Def], Ctx & { Seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["Dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["Meta"]["onResolve"],
        {
            Dict: WithPropValue<Ctx["Dict"], "$resolution", Ctx["Dict"][Def]>
            Meta: Ctx["Meta"]
            Seen: Ctx["Seen"] & { [K in Def]: true }
        }
    >

    type OnCycleOf<
        Def extends keyof Ctx["Dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["Meta"]["onCycle"],
        {
            Dict: WithPropValue<Ctx["Dict"], "$cyclic", Ctx["Dict"][Def]>
            Meta: Ctx["Meta"]
            Seen: {}
        }
    >
}

export class alias extends terminalNode {
    static matches(def: string, ctx: Node.context) {
        return !!ctx.space && def in ctx.space.dictionary
    }

    constructor(def: string, private ctx: Node.context) {
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

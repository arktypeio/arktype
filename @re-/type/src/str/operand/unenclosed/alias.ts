import { WithPropValue } from "@re-/tools"
import { Root } from "../../../root.js"
import { Node } from "../common.js"

export namespace AliasType {
    export type Infer<
        Def extends keyof Ctx["Space"]["Resolutions"],
        Ctx extends Node.InferenceContext
    > = "onResolve" extends keyof Ctx["Space"]["Meta"]
        ? Def extends "$resolution"
            ? BaseOf<Def, Ctx>
            : OnResolveOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["Space"]["Meta"]
        ? Def extends keyof Ctx["Seen"]
            ? OnCycleOf<Def, Ctx>
            : BaseOf<Def, Ctx>
        : BaseOf<Def, Ctx>

    type BaseOf<
        Def extends keyof Ctx["Space"]["Resolutions"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["Space"]["Resolutions"][Def],
        Ctx & { Seen: { [K in Def]: true } }
    >

    type OnResolveOf<
        Def extends keyof Ctx["Space"]["Resolutions"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["Space"]["Meta"]["onResolve"],
        {
            Space: {
                Resolutions: WithPropValue<
                    Ctx["Space"]["Resolutions"],
                    "$resolution",
                    Ctx["Space"]["Resolutions"][Def]
                >
                Meta: Ctx["Space"]["Meta"]
            }
            Seen: Ctx["Seen"] & { [K in Def]: true }
        }
    >

    type OnCycleOf<
        Def extends keyof Ctx["Space"]["Resolutions"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["Space"]["Meta"]["onCycle"],
        {
            Space: {
                Resolutions: WithPropValue<
                    Ctx["Space"]["Resolutions"],
                    "$cyclic",
                    Ctx["Space"]["Resolutions"][Def]
                >
                Meta: Ctx["Space"]["Meta"]
            }
            Seen: {}
        }
    >
}

export class AliasNode extends Node.TerminalNode {
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

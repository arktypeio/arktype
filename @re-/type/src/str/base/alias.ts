import { WithPropValue } from "@re-/tools"
import { Node } from "../../common.js"
import { TerminalNode } from "../../node/terminal.js"
import { Root } from "../../root.js"

export namespace AliasType {
    export type Infer<
        Def extends keyof Ctx["space"]["Dict"],
        Ctx extends Node.InferenceContext
    > = "onResolve" extends keyof Ctx["space"]["Meta"]
        ? Def extends "$resolution"
            ? BaseOf<Def, Ctx>
            : OnResolveOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["space"]["Meta"]
        ? Def extends keyof Ctx["seen"]
            ? OnCycleOf<Def, Ctx>
            : BaseOf<Def, Ctx>
        : BaseOf<Def, Ctx>

    type BaseOf<
        Def extends keyof Ctx["space"]["Dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["space"]["Tree"][Def],
        Ctx & { seen: { [K in Def]: true } }
    >

    type OnResolveOf<
        Def extends keyof Ctx["space"]["Dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["space"]["Meta"]["onResolve"],
        {
            space: {
                Dict: WithPropValue<
                    Ctx["space"]["Dict"],
                    "$resolution",
                    Ctx["space"]["Dict"][Def]
                >
                Meta: Ctx["space"]["Meta"]
                Tree: WithPropValue<
                    Ctx["space"]["Tree"],
                    "$resolution",
                    Ctx["space"]["Tree"][Def]
                >
            }
            seen: Ctx["seen"] & { [K in Def]: true }
        }
    >

    type OnCycleOf<
        Def extends keyof Ctx["space"]["Dict"],
        Ctx extends Node.InferenceContext
    > = Root.Infer<
        Ctx["space"]["Meta"]["onCycle"],
        {
            space: {
                Dict: WithPropValue<
                    Ctx["space"]["Dict"],
                    "$cyclic",
                    Ctx["space"]["Dict"][Def]
                >
                Meta: Ctx["space"]["Meta"]
                Tree: WithPropValue<
                    Ctx["space"]["Tree"],
                    "$cyclic",
                    Ctx["space"]["Tree"][Def]
                >
            }
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

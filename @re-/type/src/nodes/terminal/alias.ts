import { WithPropValue } from "@re-/tools"
import { Root } from "../../root.js"
import { Allows } from "../allows.js"
import { Base } from "../base.js"
import { Create } from "../create.js"
import { terminalNode } from "./terminal.js"

export namespace Alias {
    export type Infer<
        Def extends keyof Ctx["Dict"],
        Ctx extends Base.InferenceContext
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
        Ctx extends Base.InferenceContext
    > = Root.Infer<Ctx["Dict"][Def], Ctx & { Seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["Dict"],
        Ctx extends Base.InferenceContext
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
        Ctx extends Base.InferenceContext
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
    static matches(def: string, ctx: Base.context) {
        return !!ctx.space && def in ctx.space.dictionary
    }

    constructor(private def: string, private ctx: Base.context) {
        super()
    }

    toString() {
        return this.def
    }

    get resolution() {
        return this.ctx.space!.resolutions[this.def]
    }

    check(args: Allows.Args) {
        return this.resolution.check(args)
    }

    create(args: Create.Args) {
        return this.resolution.create(args)
    }
}

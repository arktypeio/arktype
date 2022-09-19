import type { WithPropValue } from "@re-/tools"
import type { Allows } from "../allows.js"
import type { Base } from "../base.js"
import type { Generate } from "../generate.js"
import type { RootInfer } from "../root.js"
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
    > = RootInfer<Ctx["Dict"][Def], Ctx & { Seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["Dict"],
        Ctx extends Base.InferenceContext
    > = RootInfer<
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
    > = RootInfer<
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

    toString() {
        return this.definition
    }

    get resolution() {
        return this.context.space!.resolutions[this.definition]
    }

    check(args: Allows.Args) {
        return this.resolution.check(args)
    }

    generate(args: Generate.Args) {
        return this.resolution.generate(args)
    }
}

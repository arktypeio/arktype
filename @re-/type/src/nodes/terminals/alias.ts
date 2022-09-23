import type { WithPropValue } from "@re-/tools"
import type { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { Check, Generate } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

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
    > = RootNode.Infer<Ctx["Dict"][Def], Ctx & { Seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["Dict"],
        Ctx extends Base.InferenceContext
    > = RootNode.Infer<
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
    > = RootNode.Infer<
        Ctx["Meta"]["onCycle"],
        {
            Dict: WithPropValue<Ctx["Dict"], "$cyclic", Ctx["Dict"][Def]>
            Meta: Ctx["Meta"]
            Seen: {}
        }
    >
}

export class Alias extends TerminalNode {
    static matches(def: string, context: Base.context) {
        return !!context.space && def in context.space.dictionary
    }

    toString() {
        return this.definition
    }

    get resolution() {
        return this.context.space!.resolutions[this.definition]
    }

    check(args: Check.CheckArgs) {
        return this.resolution.check(args)
    }

    generate(args: Generate.GenerateArgs) {
        return this.resolution.generate(args)
    }
}

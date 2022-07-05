import { And, Get, WithPropValue } from "@re-/tools"
import type { MetaKey } from "../../space.js"
import { Resolution } from "../resolution.js"
import { Root } from "../root.js"
import { Base } from "./base.js"

type GetMetaDefinitions<Dict> = MetaKey extends keyof Dict ? Dict[MetaKey] : {}

export namespace Alias {
    export type Parse<
        Def extends keyof Dict,
        Dict,
        Seen
    > = Dict[Def] extends Base.Parsing.ParseErrorMessage
        ? unknown
        : And<
              "onResolve" extends keyof GetMetaDefinitions<Dict> ? true : false,
              Def extends "resolution" ? false : true
          > extends true
        ? Root.Parse<
              Get<GetMetaDefinitions<Dict>, "onResolve">,
              WithPropValue<Dict, "resolution", Dict[Def]>,
              Seen & { [K in Def]: true }
          >
        : And<
              "onCycle" extends keyof GetMetaDefinitions<Dict> ? true : false,
              Def extends keyof Seen ? true : false
          > extends true
        ? Root.Parse<
              Get<GetMetaDefinitions<Dict>, "onCycle">,
              WithPropValue<Dict, "cyclic", Dict[Def]>,
              {}
          >
        : Root.Parse<Dict[Def], Dict, Seen & { [K in Def]: true }>

    export const matches = (def: string, ctx: Base.Parsing.Context) =>
        def in ctx.dictionary

    export class Node extends Base.Leaf<string> {
        resolution = new Resolution.Node(this.def, this.ctx)

        // resolve() {
        //     if (!(this.ctx.resolutions[this.def] instanceof Resolution.Node)) {
        //         // If this is the first time we've seen the alias, ctx.resolutions[def] will be a definition from space.
        //         // Parse it to create a Node that will be used for future resolutions of the alias.
        //         this.ctx.resolutions[this.def] = new Resolution.Node(
        //             this.def,
        //             this.ctx
        //         )
        //     }
        //     return this.ctx.resolutions[this.def] as Base.Parsing.Node
        // }

        allows(args: Base.Validation.Args) {
            return this.resolution.allows(args)
        }

        generate(args: Base.Generation.Args) {
            return this.resolution.generate(args)
        }
    }
}

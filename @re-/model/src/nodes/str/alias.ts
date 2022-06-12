import { And, WithPropValue } from "@re-/tools"
import { Root } from "../root.js"
import { Common, Leaf } from "#common"

export namespace Alias {
    export type Parse<Def extends keyof Dict, Dict, Seen> = And<
        "onResolve" extends keyof Dict ? true : false,
        Def extends "resolution" ? false : true
    > extends true
        ? Root.Parse<
              // @ts-ignore
              Dict["onResolve"],
              WithPropValue<Dict, "resolution", Dict[Def]>,
              Seen & { [K in Def]: true }
          >
        : And<
              "onCycle" extends keyof Dict ? true : false,
              Def extends keyof Seen ? true : false
          > extends true
        ? Root.Parse<
              // @ts-ignore
              Dict["onCycle"],
              WithPropValue<Dict, "cyclic", Dict[Def]>,
              {}
          >
        : Root.Parse<Dict[Def], Dict, Seen & { [K in Def]: true }>

    export const matches = (def: string, ctx: Common.ParseContext) =>
        ctx.space && def in ctx.space.models

    export class Node extends Leaf<string> {
        resolve() {
            // the matches() function ensures space is defined
            const space = this.ctx.space!
            /**
             * Keep track of definitions we've seen since last resolving to an object or built-in.
             * If we encounter the same definition twice, we're dealing with a shallow cyclic space
             * like {user: "person", person: "user"}.
             *
             */
            if (this.ctx.shallowSeen.includes(this.def)) {
                throw new Error("Shallow cycle")
            }
            let nextDef = space.modelDefinitions[this.def]
            if (this.ctx.seen.includes(this.def) && "onCycle" in space.config) {
                space.inputs.dictionary.cyclic = nextDef
                nextDef = space.config.onCycle
            } else if (
                this.ctx.seen.includes(this.def) &&
                "onResolve" in space.config
            ) {
                space.inputs.dictionary.resolution = nextDef
                nextDef = space.config.onResolve
            }
            return (space.models[this.def] as any).root
            // return Root.parse(nextDef, {
            //     ...this.ctx,
            //     seen: [...this.ctx.seen, this.def],
            //     shallowSeen: [...this.ctx.shallowSeen, this.def],
            //     stringRoot: null
            // })
        }

        allows(args: Common.AllowsArgs) {
            this.resolve().allows(args)
            // const customValidator =
            //     this.ctx.space.config?.models?.[this.def]?.validate
            //         ?.validator ??
            //     this.ctx.space.config.validate?.validator
            // if (customValidator) {
            //     return errorsFromCustomValidator(customValidator, [
            //         value,
            //         errors,
            //         {
            //             def,
            //             ctx
            //         }
            //     ])
            // }
            // return errors
        }

        generate() {
            return this.resolve().generate()
        }
    }
}

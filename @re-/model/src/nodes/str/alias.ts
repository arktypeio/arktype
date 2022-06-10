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
        def in ctx.config.space.dictionary

    export class Node extends Leaf<string> {
        resolve() {
            /**
             * Keep track of definitions we've seen since last resolving to an object or built-in.
             * If we encounter the same definition twice, we're dealing with a shallow cyclic space
             * like {user: "person", person: "user"}.
             *
             */
            if (this.ctx.shallowSeen.includes(this.def)) {
                throw new Error("Shallow cycle")
            }
            if (this.ctx.seen.includes(this.def)) {
                throw new Error("cycle (temporary error)")
            }
            let nextDef = this.ctx.config.space.dictionary[this.def]
            if (
                this.ctx.seen.includes(this.def) &&
                "onCycle" in this.ctx.config.space.config
            ) {
                this.ctx.config.space.dictionary.cyclic = nextDef
                nextDef = this.ctx.config.space.config.onCycle
            } else if (
                this.ctx.seen.includes(this.def) &&
                "onResolve" in this.ctx.config.space.config
            ) {
                this.ctx.config.space.dictionary.resolution = nextDef
                nextDef = this.ctx.config.space.config.onResolve
            }
            return Root.parse(nextDef, {
                ...this.ctx,
                seen: [...this.ctx.seen, this.def],
                shallowSeen: [...this.ctx.shallowSeen, this.def],
                stringRoot: null
            })
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            this.resolve().allows(value, errors)
            // const customValidator =
            //     this.ctx.config.space.config?.models?.[this.def]?.validate
            //         ?.validator ??
            //     this.ctx.config.space.config.validate?.validator
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

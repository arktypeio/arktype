import { Base } from "./base/index.js"
import { Root } from "./root.js"

export namespace Resolution {
    export class Node extends Base.Branch<string> {
        constructor(def: string, ctx: Base.Parsing.Context) {
            if (!(ctx.resolutions[def] instanceof Node)) {
                // If this is the first time we've seen the alias, create a Node that will be used for future resolutions of the alias.
                ctx.resolutions[def] = super(def, ctx)
            }
            return ctx.resolutions[def] as Node
        }

        parse() {
            return [Root.parse(this.ctx.dictionary[this.def], this.ctx)]
        }

        allows(args: Base.Validation.Args): boolean {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.validate)
            if (typeof args.value === "object" && args.value !== null) {
                if (
                    args.ctx.checkedValuesByAlias[this.def]?.includes(
                        args.value
                    )
                ) {
                    // If we've already seen this value, it must not have any errors or else we wouldn't be here
                    return true
                }
                if (!args.ctx.checkedValuesByAlias[this.def]) {
                    nextArgs.ctx.checkedValuesByAlias[this.def] = [args.value]
                } else {
                    nextArgs.ctx.checkedValuesByAlias[this.def].push(args.value)
                }
            }
            const customValidator =
                nextArgs.cfg.validator ??
                nextArgs.ctx.modelCfg.validator ??
                "default"
            if (customValidator !== "default") {
                return Base.Validation.customValidatorAllows(
                    customValidator,
                    this,
                    nextArgs
                )
            }
            return this.firstChild().allows(nextArgs)
        }

        generate(args: Base.Generation.Args) {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.generate)
            if (args.ctx.seen.includes(this.def)) {
                const onRequiredCycle =
                    nextArgs.cfg.onRequiredCycle ??
                    nextArgs.ctx.modelCfg.onRequiredCycle
                if (onRequiredCycle) {
                    return onRequiredCycle
                }
                throw new Base.Generation.RequiredCycleError(
                    this.def,
                    args.ctx.seen
                )
            }
            return this.firstChild().generate(nextArgs)
        }

        private nextArgs<
            Args extends {
                ctx: Base.Traversal.Context<any>
                cfg: any
            }
        >(args: Args, aliasCfg: any): Args {
            return {
                ...args,
                ctx: {
                    ...args.ctx,
                    seen: [...args.ctx.seen, this.def],
                    modelCfg: { ...args.ctx.modelCfg, ...aliasCfg }
                }
            }
        }
    }
}

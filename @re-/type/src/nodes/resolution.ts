import { deepMerge } from "@re-/tools"
// TODO: Is this okay to import here?
import { initializeParseContext, parseContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import { getResolutionDefAndOptions, SpaceMeta } from "../space.js"
import { Allows } from "./allows.js"
import { Base } from "./base.js"
import { Create } from "./create.js"
import { References } from "./references.js"
import { Traverse } from "./traverse.js"

export class ResolutionNode extends Base.node {
    public root: Base.node
    public rootDef: unknown
    private ctx: Base.context

    constructor(public alias: string, space: SpaceMeta) {
        super()
        // If this is the first time we've seen the alias,
        // create a Node that will be used for future resolutions.
        const defAndOptions = getResolutionDefAndOptions(
            space.dictionary[alias]
        )
        this.ctx = initializeParseContext(
            defAndOptions.options
                ? deepMerge(space.options, defAndOptions.options)
                : space.options,
            space
        )
        this.root = Root.parse(defAndOptions.def, this.ctx)
        this.rootDef = defAndOptions.def
    }

    get tree() {
        return this.root.tree
    }

    toString() {
        return this.root.toString()
    }

    collectReferences(
        opts: References.Options<string, boolean>,
        collected: References.Collection
    ) {
        this.root.collectReferences(opts, collected)
    }

    references(opts: References.Options<string, boolean>) {
        return this.root.references(opts)
    }

    check(args: Allows.Args) {
        const nextArgs = this.nextArgs(args, this.ctx.validate)
        if (typeof args.data === "object" && args.data !== null) {
            if (
                args.ctx.checkedValuesByAlias[this.alias]?.includes(args.data)
            ) {
                // If we've already seen this value, it must not have any errors or else we wouldn't be here
                return true
            }
            if (!args.ctx.checkedValuesByAlias[this.alias]) {
                nextArgs.ctx.checkedValuesByAlias[this.alias] = [args.data]
            } else {
                nextArgs.ctx.checkedValuesByAlias[this.alias].push(args.data)
            }
        }
        const customValidator =
            nextArgs.cfg.validator ??
            nextArgs.ctx.modelCfg.validator ??
            "default"
        if (customValidator !== "default") {
            // TODO: Check custom validator format.
            Allows.customValidatorAllows(customValidator, this, nextArgs)
            return
        }
        this.root.check(nextArgs)
    }

    create(args: Create.Args) {
        const nextArgs = this.nextArgs(args, this.ctx.create)
        if (args.ctx.seen.includes(this.alias)) {
            const onRequiredCycle =
                nextArgs.cfg.onRequiredCycle ??
                nextArgs.ctx.modelCfg.onRequiredCycle
            if (onRequiredCycle) {
                return onRequiredCycle
            }
            throw new Create.RequiredCycleError(this.alias, args.ctx.seen)
        }
        return this.root.create(nextArgs)
    }

    private nextArgs<
        Args extends {
            ctx: Traverse.Context<any>
            cfg: any
        }
    >(args: Args, aliasCfg: any): Args {
        return {
            ...args,
            ctx: {
                ...args.ctx,
                seen: [...args.ctx.seen, this.alias],
                modelCfg: { ...args.ctx.modelCfg, ...aliasCfg }
            }
        }
    }
}

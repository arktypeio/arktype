import { deepMerge, ElementOf, Get, IsAny, IterateType, Join } from "@re-/tools"
import { Node } from "./node/index.js"
import { Root } from "./root.js"
import { getResolutionDefAndOptions, SpaceMeta } from "./space.js"
import { Str } from "./str/str.js"

export namespace ResolutionType {
    export type Validate<
        Alias extends keyof Dict,
        Dict
    > = Dict[Alias] extends string
        ? ValidateStringResolution<Alias, Dict>
        : Root.Validate<Dict[Alias], Dict>

    export type ValidateStringResolution<
        Alias extends keyof Dict,
        Dict
    > = IfShallowCycleErrorElse<
        CheckResolutionForShallowCycle<
            Dict[Alias],
            Dict,
            [Extract<Alias, string>]
        >,
        Str.Validate<Extract<Dict[Alias], string>, Dict>
    >
}

export class ResolutionNode extends Node.base {
    public root: Node.base
    public rootDef: unknown
    private ctx: Node.context

    constructor(public alias: string, space: SpaceMeta) {
        super()
        // If this is the first time we've seen the alias,
        // create a Node that will be used for future resolutions.
        const defAndOptions = getResolutionDefAndOptions(
            space.dictionary[alias]
        )
        this.ctx = Node.initializeContext(
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
        opts: Node.References.Options<string, boolean>,
        collected: Node.References.Collection
    ) {
        this.root.collectReferences(opts, collected)
    }

    references(opts: Node.References.Options<string, boolean>) {
        return this.root.references(opts)
    }

    allows(args: Node.Allows.Args): boolean {
        const nextArgs = this.nextArgs(args, this.ctx.validate)
        if (typeof args.value === "object" && args.value !== null) {
            if (
                args.ctx.checkedValuesByAlias[this.alias]?.includes(args.value)
            ) {
                // If we've already seen this value, it must not have any errors or else we wouldn't be here
                return true
            }
            if (!args.ctx.checkedValuesByAlias[this.alias]) {
                nextArgs.ctx.checkedValuesByAlias[this.alias] = [args.value]
            } else {
                nextArgs.ctx.checkedValuesByAlias[this.alias].push(args.value)
            }
        }
        const customValidator =
            nextArgs.cfg.validator ??
            nextArgs.ctx.modelCfg.validator ??
            "default"
        if (customValidator !== "default") {
            return Node.Allows.customValidatorAllows(
                customValidator,
                this,
                nextArgs
            )
        }
        return this.root.allows(nextArgs)
    }

    create(args: Node.Create.Args) {
        const nextArgs = this.nextArgs(args, this.ctx.create)
        if (args.ctx.seen.includes(this.alias)) {
            const onRequiredCycle =
                nextArgs.cfg.onRequiredCycle ??
                nextArgs.ctx.modelCfg.onRequiredCycle
            if (onRequiredCycle) {
                return onRequiredCycle
            }
            throw new Node.Create.RequiredCycleError(this.alias, args.ctx.seen)
        }
        return this.root.create(nextArgs)
    }

    private nextArgs<
        Args extends {
            ctx: Node.Traverse.Context<any>
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

// const shallowCycleError = (shallowSeen: string[]) =>
//     `${shallowSeen[0]} references a shallow cycle: ${shallowSeen.join("=>")}.`

type ShallowCycleError<Seen extends string[]> =
    Node.ParseError<`${Seen[0]} references shallow cycle ${Join<Seen, "=>">}.`>

type CheckResolutionForShallowCycle<
    Resolution,
    Dict,
    Seen extends string[]
> = IsAny<Resolution> extends true
    ? []
    : CheckResolutionForShallowCycleRecurse<Resolution, Dict, Seen>

/** For a given resolution, check it's shallow references to other aliases for cycles */
type CheckResolutionForShallowCycleRecurse<
    Resolution,
    Dict,
    Seen extends string[]
> = Resolution extends string
    ? IterateReferencesForShallowCycle<
          Str.References<Resolution, Dict>,
          Dict,
          Seen
      >
    : []

/**  For a list of string references, if any is in Seen, return Seen plus that reference,
 *   to represent the path at which the cycle occured. Otherwise, append the reference to seen and recurse.  */
type IterateReferencesForShallowCycle<
    References,
    Dict,
    Seen extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? Current extends keyof Dict
        ? Current extends ElementOf<Seen>
            ? [...Seen, Current]
            : IfShallowCycleTupleElse<
                  CheckResolutionForShallowCycleRecurse<
                      Get<Dict, Current>,
                      Dict,
                      [...Seen, Current]
                  >,
                  IterateReferencesForShallowCycle<Remaining, Dict, Seen>
              >
        : IterateReferencesForShallowCycle<Remaining, Dict, Seen>
    : []

/** When we detect a ShallowCycle, the generic will return a string tuple representing the cycle path.
 *  Otherwise, we return an empty tuple if no tuple is detected.
 *  This generic simply returns cycle path if it is not an empty tuple, otherwise it will return Else.
 */
type IfShallowCycleTupleElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : CheckResult

type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleError<CheckResult>

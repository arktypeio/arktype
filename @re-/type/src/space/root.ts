import type { Dictionary, Evaluate } from "@re-/tools"
import { chainableNoOpProxy, deepMerge, mapValues } from "@re-/tools"
import type { RootNode } from "../nodes/common.js"
import { ResolutionNode } from "../nodes/resolution.js"
import { initializeParseContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import { Type } from "../type.js"
import type { DynamicType, ToType, TypeFn, TypeOptions } from "../type.js"
import type { ParseSpace, ValidateAliases } from "./parse.js"

// TODO: Ensure there are no extraneous types/space calls from testing
export const space: SpaceFn = (aliases, options) =>
    dynamicSpace(aliases, options as any) as any

export type SpaceFn = <Aliases>(
    aliases: ValidateAliases<Aliases>,
    options?: TypeOptions
) => SpaceOutput<{ Aliases: Aliases; Resolutions: ParseSpace<Aliases> }>

export type DynamicSpace = Record<string, DynamicType> & {
    $root: DynamicRoot
}

type DynamicRoot = SpaceRootFrom<any>

// TODO: Update dict extension meta to not deepmerge, fix extension meta.
export const dynamicSpace = (
    dictionary: Dictionary,
    options: SpaceOptions = {}
) => {
    const root = new SpaceRoot(dictionary, options)
    const compiled: Record<string, any> = { $root: root }
    for (const alias of Object.keys(dictionary)) {
        const resolution = new ResolutionNode(alias, root)
        root.resolutions[alias] = resolution
        compiled[alias] = new Type(resolution.root, resolution, options)
    }
    return compiled as DynamicSpace
}

// TODO: Ensure "Dict"/"dictionary" etc. is not used anywhere referencing space
export class SpaceRoot implements DynamicRoot {
    resolutions: Record<string, ResolutionNode>

    constructor(
        public definitions: Dictionary,
        public options: SpaceOptions = {}
    ) {
        this.resolutions = {}
    }

    type(definition: unknown, options: TypeOptions<any> = {}) {
        const compiledOptions = deepMerge(this.options, options)
        const root = Root.parse(
            definition,
            initializeParseContext(compiledOptions, this)
        )
        return new Type(definition, root, compiledOptions) as any
    }

    extend(extensions: Dictionary, overrides?: SpaceOptions) {
        return dynamicSpace(
            { ...this.definitions, ...extensions },
            deepMerge(this.options, overrides)
        ) as any
    }

    get infer() {
        return chainableNoOpProxy
    }

    get ast() {
        return mapValues(this.resolutions, (resolution) => resolution.ast)
    }
}

export type ResolvedSpace = {
    Aliases: unknown
    Resolutions: unknown
}

export namespace ResolvedSpace {
    export type From<S extends ResolvedSpace> = S

    export type Empty = From<{ Aliases: {}; Resolutions: {} }>
}

export type SpaceOutput<Space extends ResolvedSpace> = Evaluate<
    SpaceTypes<Space["Resolutions"]> & {
        $root: SpaceRootFrom<Space>
    }
>

export type SpaceOptions = TypeOptions

export type SpaceRootFrom<Space extends ResolvedSpace> = Evaluate<{
    infer: InferSpaceRoot<Space["Resolutions"]>
    definitions: Space["Resolutions"]
    ast: Space["Resolutions"]
    type: TypeFn<Space>
    // extend: ExtendFn<S>
    options: SpaceOptions
}>

export type SpaceTypes<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: ToType<Name, Resolutions[Name], Resolutions>
}>

export type InferSpaceRoot<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: RootNode.Infer<Resolutions[Name], Resolutions>
}>

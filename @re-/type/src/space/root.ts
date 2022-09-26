import type { Conform, Dictionary, Evaluate } from "@re-/tools"
import { chainableNoOpProxy, deepMerge, mapValues } from "@re-/tools"
import type { RootNode } from "../nodes/common.js"
import { ResolutionNode } from "../nodes/resolution.js"
import { initializeParseContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import { Type } from "../type.js"
import type { DynamicType, ToType, TypeFn, TypeOptions } from "../type.js"
import type { Space } from "./parse.js"

// TODO: Ensure there are no extraneous types/space calls from testing
export const space: SpaceFn = (dictionary, options) =>
    dynamicSpace(dictionary, options as any) as any

export const types = space({ a: "string[]", b: "a" }, { onResolve: "0" }).$root

export type SpaceFn = <Aliases, Meta = {}>(
    aliases: Space.ValidateAliases<Aliases, Meta>,
    options?: TypeOptions & Conform<Meta, Space.ValidateMeta<Meta, Aliases>>
) => CompileSpace<{
    Aliases: Aliases
    Meta: Conform<Meta, Space.MetaDefinitions>
}>

type CompileSpace<S extends Space.Definition> = SpaceOutput<
    S & { Resolutions: Space.Parse<S> }
>

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

export type SpaceOutput<S extends Space.Resolved> = Evaluate<
    SpaceTypes<S["Resolutions"]> & {
        $root: SpaceRootFrom<S>
    }
>

export type SpaceOptions<Meta = Space.MetaDefinitions> = Evaluate<
    TypeOptions & Meta
>

export type SpaceRootFrom<S extends Space.Resolved> = Evaluate<{
    infer: InferSpaceRoot<S["Resolutions"]>
    definitions: S["Aliases"]
    ast: S["Resolutions"]
    type: TypeFn<S>
    // extend: ExtendFn<S>
    options: SpaceOptions<S["Meta"]>
}>

export type SpaceTypes<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: ToType<Name, Resolutions[Name], Resolutions>
}>

export type InferSpaceRoot<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: RootNode.Infer<Resolutions[Name], Resolutions>
}>

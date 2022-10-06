import type { Dictionary, Evaluate } from "@re-/tools"
import { ArktypeSpace } from "./nodes/roots/space.js"
import type {
    Arktype,
    ArktypeOptions,
    DynamicArktype
} from "./nodes/roots/type.js"
import { ArktypeRoot } from "./nodes/roots/type.js"
import type { inferAst } from "./nodes/traverse/ast/infer.js"
import type { Validate } from "./nodes/traverse/ast/validate.js"
import { Root } from "./parser/root.js"
import type { ParseSpace } from "./parser/space.js"
import type { InferredTypeFn } from "./type.js"

type TypedSpaceFn = <Aliases, Resolutions = ParseSpace<Aliases>>(
    aliases: Validate.syntactic<Aliases, Resolutions>,
    options?: ArktypeOptions
) => SpaceOutput<{ aliases: Aliases; resolutions: Resolutions }>

type DynamicSpaceFn = <Aliases extends Dictionary>(
    aliases: Aliases,
    options?: ArktypeOptions
) => DynamicSpace<Aliases>

export type SpaceFn = TypedSpaceFn & { dynamic: DynamicSpaceFn }

export type DynamicSpace<Aliases extends Dictionary = Dictionary> = Record<
    keyof Aliases,
    DynamicArktype
> & {
    $root: DynamicSpaceRoot
}

export type DynamicSpaceRoot = SpaceRootFrom<{
    aliases: Dictionary
    resolutions: Dictionary
}>

const rawSpace = (aliases: Dictionary, context: ArktypeOptions) => {
    const resolutions: Dictionary<ArktypeRoot> = {}
    for (const name in aliases) {
        resolutions[name] = new ArktypeRoot(
            Root.parse(aliases[name], { aliases }),
            context,
            resolutions
        )
    }
    resolutions.$root = new ArktypeSpace(resolutions, context) as any
    return resolutions as any as DynamicSpace
}

rawSpace.dynamic = rawSpace
export const space: SpaceFn = rawSpace as any

export type ResolvedSpace = {
    aliases: unknown
    resolutions: unknown
}

export namespace ResolvedSpace {
    export type From<S extends ResolvedSpace> = S

    export type Empty = From<{ aliases: {}; resolutions: {} }>
}

export type SpaceOutput<Space extends ResolvedSpace> = SpaceTypeRoots<
    Space["resolutions"]
> & {
    $root: SpaceRootFrom<Space>
}

export type SpaceRootFrom<Space extends ResolvedSpace> = {
    infer: InferSpaceRoot<Space["resolutions"]>
    aliases: Space["aliases"]
    ast: Space["resolutions"]
    type: InferredTypeFn<Space>
    options: ArktypeOptions
}

export type SpaceTypeRoots<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: Arktype<Resolutions[Name], Resolutions>
}>

export type InferSpaceRoot<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: inferAst<Resolutions[Name], Resolutions>
}>

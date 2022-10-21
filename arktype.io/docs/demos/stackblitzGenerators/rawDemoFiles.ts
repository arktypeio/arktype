import constraints from "../generated/constraints"
import declaration from "../generated/declaration"
import group from "../generated/group"
import names from "../generated/names"
import space from "../generated/space"
import type from "../generated/type"
import user from "../generated/user"

import type { AddonFile, EmbedId } from "./createStackblitzDemo"

export const contentsByAddonFile: Record<AddonFile, string> = {
    user,
    group,
    names
}

export const contentsByEmbedId: Record<EmbedId, string> = {
    type,
    space,
    constraints,
    declaration
}
export const addonFilesByEmdedId: Partial<Record<EmbedId, AddonFile[]>> = {
    declaration: ["user", "group", "names"]
}

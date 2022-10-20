import constraints from "../static/generated/constraints"
import declaration from "../static/generated/declaration"
import group from "../static/generated/group"
import names from "../static/generated/names"
import space from "../static/generated/space"
import type from "../static/generated/type"
import user from "../static/generated/user"

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

import constraints from "../generated/constraints"
import scope from "../generated/scope"
import type from "../generated/type"

import type { AddonFile, EmbedId } from "./createStackblitzDemo"

export const contentsByAddonFile: Record<AddonFile, string> = {}

export const contentsByEmbedId: Record<EmbedId, string> = {
    type,
    scope,
    constraints
}

export const addonFilesByEmdedId: Partial<Record<EmbedId, AddonFile[]>> = {}

export const getAddonFiles = (addonFiles: AddonFile[]) => {
    const contentsByRequestedFile: Record<string, string> = {}
    for (const file of addonFiles) {
        contentsByRequestedFile[`${file}.ts`] = contentsByAddonFile[file]
    }
    return contentsByRequestedFile
}

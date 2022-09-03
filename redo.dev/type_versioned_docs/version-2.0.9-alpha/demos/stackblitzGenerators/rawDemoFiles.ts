import constraints from "raw-loader!../static/generated/constraints.ts.raw"
import declaration from "raw-loader!../static/generated/declaration.ts.raw"
import group from "raw-loader!../static/generated/group.ts.raw"
import space from "raw-loader!../static/generated/space.ts.raw"
import type from "raw-loader!../static/generated/type.ts.raw"
import user from "raw-loader!../static/generated/user.ts.raw"
import { AddonFile, EmbedId } from "./createStackblitzDemo"

export const contentsByAddonFile: Record<AddonFile, string> = {
    user,
    group
}
export const contentsByEmbedId: Record<EmbedId, string> = {
    type,
    space,
    constraints,
    declaration
}

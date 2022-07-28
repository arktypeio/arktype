import constraints from "raw-loader!/stackblitz/generated/constraints.ts.raw"
import declaration from "raw-loader!/stackblitz/generated/declaration.ts.raw"
import group from "raw-loader!/stackblitz/generated/group.ts.raw"
import model from "raw-loader!/stackblitz/generated/model.ts.raw"
import space from "raw-loader!/stackblitz/generated/space.ts.raw"
import user from "raw-loader!/stackblitz/generated/user.ts.raw"
import { EmbedId } from "./stackblitzDemoBuilder"

export const contentsByEmbedId: Record<EmbedId, string> = {
    model,
    space,
    constraints,
    declaration,
    user,
    group
}

import constraints from "raw-loader!../static/generated/constraints.ts.raw"
import declaration from "raw-loader!../static/generated/declaration.ts.raw"
import group from "raw-loader!../static/generated/group.ts.raw"
import model from "raw-loader!../static/generated/model.ts.raw"
import space from "raw-loader!../static/generated/space.ts.raw"
import user from "raw-loader!../static/generated/user.ts.raw"
import { DeclarationFiles, EmbedId } from "./stackblitzDemoBuilder"

export const contentsByEmbedId: Record<EmbedId | DeclarationFiles, string> = {
    model,
    space,
    constraints,
    declaration,
    user,
    group
}

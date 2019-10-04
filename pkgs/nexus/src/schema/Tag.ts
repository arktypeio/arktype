import { objectType } from "nexus"

export const Tag = objectType({
    name: "Tag",
    definition(t) {
        t.model.id()
        t.model.name()
    }
})

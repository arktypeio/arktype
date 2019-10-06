import { objectType } from "nexus"

export const Test = objectType({
    name: "Test",
    definition(t) {
        t.model.id()
        t.model.name()
        t.model.steps()
        t.model.tags()
    }
})

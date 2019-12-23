import { objectType } from "nexus"

export const User = objectType({
    name: "User",
    definition: t => {
        t.model.id()
        t.model.email()
        t.model.first()
        t.model.last()
        t.model.password()
        t.model.tests()
        t.model.selectors()
        t.model.tags()
        t.model.steps()
    }
})

import { objectType } from "nexus"

export const Step = objectType({
    name: "Step",
    definition(t) {
        t.model.id()
        t.model.action()
        t.model.selector()
        t.model.value()
    }
})

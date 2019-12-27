import { objectType } from "nexus"

export const Selector = objectType({
    name: "Selector",
    definition: t => {
        t.model.id()
        t.model.css()
    }
})

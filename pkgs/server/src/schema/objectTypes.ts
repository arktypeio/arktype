import { objectType } from "nexus"

export const objectTypes = [
    objectType({
        name: "Selector",
        definition: t => {
            t.model.id()
            t.model.css()
        }
    }),
    objectType({
        name: "Step",
        definition: t => {
            t.model.id()
        }
    }),
    objectType({
        name: "Tag",
        definition: t => {
            t.model.id()
            t.model.name()
        }
    }),
    objectType({
        name: "Test",
        definition: t => {
            t.model.id()
            t.model.name()
            t.model.steps()
            t.model.tags()
        }
    }),
    objectType({
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
]

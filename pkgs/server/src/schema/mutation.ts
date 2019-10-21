import { mutationType } from "nexus"

export const Mutation = mutationType({
    definition(t) {
        t.crud.createOneTag()
        t.crud.createOneSelector()
        t.crud.createOneUser()
        t.crud.createOneTest()
        t.crud.createOneStep()
    }
})

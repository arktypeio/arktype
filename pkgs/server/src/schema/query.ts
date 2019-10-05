import { queryType } from "nexus"

export const Query = queryType({
    definition(t) {
        t.crud.tag()
    }
})

import { queryType } from "nexus"

export const Query = queryType({
    definition(t) {
        t.crud.tag()
        t.crud.tags()
        t.crud.selector()
        t.crud.selectors()
        t.crud.step()
        t.crud.steps()
        t.crud.test()
        t.crud.tests()
        t.crud.user()
        t.crud.users()
    }
})

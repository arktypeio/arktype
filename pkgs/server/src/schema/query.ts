import { queryType, objectType } from "nexus"
import { ifExists } from "../utils"

export const Query = queryType({
    definition: t => {
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
        t.field("me", {
            type: "User",
            resolve: async (_, args, { photon, userId }) => {
                const result = await ifExists(() =>
                    photon.users.findOne({ where: { id: userId } })
                )
                if (result) {
                    return result
                }
                throw new Error("User is not authenticated.")
            }
        })
    }
})

import { queryType } from "nexus"
import { ifExists } from "../utils"

export const Query = queryType({
    definition: (t) => {
        t.field("me", {
            type: "User",
            resolve: async (_, args, { prisma, userId }) => {
                const result = await ifExists(() =>
                    prisma.user.findOne({ where: { id: userId } })
                )
                if (result) {
                    return result
                }
                throw new Error("User is not authenticated.")
            },
        })
    },
})

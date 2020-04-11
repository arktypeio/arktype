import { schema } from "nexus"
import { ifExists } from "../utils"

schema.queryType({
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

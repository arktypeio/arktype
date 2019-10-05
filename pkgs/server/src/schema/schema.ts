import { join } from "path"
import { makeSchema } from "nexus"
import { nexusPrismaPlugin } from "nexus-prisma"
import { Tag } from "./tag"
import { Query } from "./query"

const appTypes = [Tag, Query]
const nexusPrismaTypes = nexusPrismaPlugin({
    types: appTypes,
    outputs: {
        typegen: join(
            __dirname,
            "../../node_modules/@types/__nexus-typegen__nexus-prisma/index.d.ts"
        )
    }
})
const allTypes = [appTypes, nexusPrismaTypes]

export const schema = makeSchema({
    types: allTypes,
    outputs: {
        typegen: join(
            __dirname,
            "../../node_modules/@types/__nexus-typegen__nexus-core/index.d.ts"
        ),
        schema: join(__dirname, "../schema.graphql")
    },
    typegenAutoConfig: {
        sources: [
            {
                source: "@generated/photon",
                alias: "photon"
            }
        ]
    }
})

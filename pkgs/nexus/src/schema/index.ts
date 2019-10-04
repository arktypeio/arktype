import * as Path from "path"
import * as Nexus from "nexus"
import * as NexusPrisma from "nexus-prisma"
import * as Tag from "./Tag"
import * as Query from "./Query"

const appTypes = [Tag, Query]
const nexusPrismaTypes = NexusPrisma.nexusPrismaPlugin({ types: appTypes })
const allTypes = [appTypes, nexusPrismaTypes]

export const schema = Nexus.makeSchema({
    types: allTypes,
    outputs: {
        typegen: Path.join(
            __dirname,
            "../../node_modules/@types/__nexus-typegen__nexus-core/index.d.ts"
        ),
        schema: Path.join(__dirname, "../schema.graphql")
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

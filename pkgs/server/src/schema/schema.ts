import { join } from "path"
import { makeSchema } from "nexus"
import { nexusPrismaPlugin } from "redo-nexus-prisma"
import { MutationResolverParams } from "redo-nexus-prisma/dist/utils"
import { objectTypes } from "./objectTypes"
import { Query } from "./queryTypes"
import { mutationTypes } from "./mutationTypes"

const types = [Query, ...mutationTypes, ...objectTypes]

const typesPath = join(__dirname, "..", "..", "node_modules", "@types")

export const schema = makeSchema({
    types,
    outputs: {
        typegen: join(typesPath, "nexus-core-generated", "index.d.ts"),
        schema: join(__dirname, "..", "..", "schema.gql")
    },
    typegenAutoConfig: {
        contextType: "Context.Context",
        sources: [
            {
                source: "@prisma/client",
                alias: "prisma"
            },
            {
                source: require.resolve("../context"),
                alias: "Context"
            }
        ]
    },
    plugins: [
        nexusPrismaPlugin({
            paths: {
                typegen: join(typesPath, "nexus-prisma-generated", "index.d.ts")
            },
            inputs: {
                user: {
                    computeFrom: ({
                        ctx: { userId }
                    }: MutationResolverParams) => ({
                        connect: {
                            id: userId
                        }
                    })
                }
            },
            collapseTo: "create"
        })
    ]
})

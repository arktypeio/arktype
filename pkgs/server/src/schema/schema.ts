import { join } from "path"
import { makeSchema } from "@nexus/schema"
import { nexusPrismaPlugin } from "redo-nexus-prisma"
import { Query } from "./queryTypes"
import { mutationTypes } from "./mutationTypes"
import { prismafy } from "prismafy"

const nodeModulesPath = join(__dirname, "..", "..", "node_modules")
const typesPath = join(nodeModulesPath, "@types")
const clientPath = join(nodeModulesPath, "@prisma", "client")

const types = [Query, ...mutationTypes, ...prismafy({ clientPath })]

export const schema = makeSchema({
    types,
    outputs: {
        typegen: join(typesPath, "nexus-core-generated", "index.d.ts"),
        schema: join(__dirname, "..", "..", "schema.gql"),
    },
    typegenAutoConfig: {
        contextType: "Context.Context",
        sources: [
            {
                source: "@prisma/client",
                alias: "prisma",
            },
            {
                source: require.resolve("../context"),
                alias: "Context",
            },
        ],
    },
    plugins: [
        nexusPrismaPlugin({
            paths: {
                typegen: join(
                    typesPath,
                    "nexus-prisma-generated",
                    "index.d.ts"
                ),
            },
            inputs: {
                user: {
                    computeFrom: ({ ctx: { userId } }) => ({
                        connect: {
                            id: userId,
                        },
                    }),
                },
            },
            collapseTo: "create",
        }),
    ],
})

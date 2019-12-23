import { join } from "path"
import { makeSchema } from "nexus"
import { nexusPrismaPlugin } from "redo-nexus-prisma"
import { Selector } from "./selector"
import { Step } from "./step"
import { Tag } from "./tag"
import { Test } from "./test"
import { User } from "./user"
import { Query } from "./query"
import { mutationTypes } from "./mutation"

const types = [Step, User, Test, Selector, Tag, Query, ...mutationTypes]

export const schema = makeSchema({
    types,
    outputs: {
        typegen: join(
            __dirname,
            "../../node_modules/@types/__nexus-typegen__nexus-core/index.d.ts"
        ),
        schema: join(__dirname, "..", "..", "schema.gql")
    },
    typegenAutoConfig: {
        contextType: "Context.Context",
        sources: [
            {
                source: "@prisma/photon",
                alias: "photon"
            },
            {
                source: require.resolve("../context"),
                alias: "Context"
            }
        ]
    },
    plugins: [
        nexusPrismaPlugin({
            outputs: {
                typegen: join(
                    __dirname,
                    "../../node_modules/@types/__nexus-typegen__nexus-prisma/index.d.ts"
                )
            },
            computedInputs: {
                user: ({ ctx: { userId } }) => ({
                    connect: {
                        id: userId
                    }
                })
            }
        })
    ]
})

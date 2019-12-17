import { join } from "path"
import { readFileSync } from "fs-extra"
import gql from "graphql-tag"
import { download } from "@prisma/fetch-engine"
import { gqlize } from ".."

beforeAll(
    async () =>
        await download({
            binaries: {
                "query-engine": join(
                    __dirname,
                    "..",
                    "..",
                    "node_modules",
                    "@prisma",
                    " photon"
                )
            },
            showProgress: true
        })
)

describe("Plugin", () => {
    it("can be built", async () => {
        const mutations = gqlize({
            schema: gql(readFileSync(join(__dirname, "schema.gql")).toString())
        })
        console.warn(mutations)
        expect(mutations).toBeTruthy()
    }, 9999999)
})

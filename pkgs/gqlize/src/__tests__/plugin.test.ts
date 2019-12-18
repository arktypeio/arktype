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
        }),
    10 * 1000
)

describe("gqlize", () => {
    it("doesn't crash", async () => {
        const mutations = gqlize({
            schema: gql(readFileSync(join(__dirname, "schema.gql")).toString()),
            upfilterKeys: ["create"]
        })
        console.warn(mutations)
        expect(mutations).toBeTruthy()
    }, 9999999)
})

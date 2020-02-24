import { graphql } from "@octokit/graphql"
import {
    makeExecutable,
    REDO_EXECUTABLE,
    EXECUTABLE_SUFFIX
} from "@re-do/utils/dist/node"
import fetch from "node-fetch"
import assert from "assert"
import { createWriteStream, existsSync } from "fs-extra"
import { once } from "events"
import { promisify } from "util"
import { finished } from "stream"
const streamFinished = promisify(finished)

const token = "0a1faa04389cf5df6264846e57c525a3dfbf5651"

const recentReleasesQuery = `
query {
    repository(name: "redo", owner: "redo-qa") {
        releases(orderBy: {field: CREATED_AT, direction: DESC}, last: 10) {
            nodes {
                tagName
                isDraft
                isPrerelease
            }
        }
    }
}
`

const assetsQuery = `
query latestAssets($tag: String!) {
    repository(name: "redo", owner: "redo-qa") {
        release(tagName: $tag) {
            releaseAssets(first: 10) {
                nodes {
                    name
                    url
                }
            }
        }
    }
}
`

const assertExists = <T>(value: T) => {
    assert(value, "Unable to find the latest Redo installation.")
    return value as NonNullable<T>
}

export const install = async () => {
    console.log("Installing the latest version of Redo...")
    const query = graphql.defaults({
        headers: {
            authorization: `token ${token}`
        }
    })
    const releasesResult = await query({
        query: recentReleasesQuery
    })
    const releases: any[] = assertExists(
        releasesResult?.repository?.releases?.nodes
    )
    const latestRelease = releases.find(
        release => !release.isDraft && !release.isPrerelease
    )
    const assetsResult = await query(assetsQuery, {
        tag: assertExists(latestRelease).tagName
    })
    const assets: any[] = assertExists(
        assetsResult?.repository?.release?.releaseAssets?.nodes
    )
    const assetUrl: string = assertExists(
        assets.find(asset => asset.name.endsWith(EXECUTABLE_SUFFIX))?.url
    )
    const assetRequestResult = await fetch(assertExists(assetUrl))

    const fileStream = createWriteStream(REDO_EXECUTABLE)
    for await (const chunk of assetRequestResult.body) {
        if (!fileStream.write(chunk)) {
            await once(fileStream, "drain")
        }
    }
    fileStream.end()
    await streamFinished(fileStream)
    makeExecutable(REDO_EXECUTABLE)
    console.log(`Succesfully installed Redo (${latestRelease.tagName})!`)
    return REDO_EXECUTABLE
}

export const getPath = async (): Promise<string> =>
    existsSync(REDO_EXECUTABLE) ? REDO_EXECUTABLE : await install()

import { graphql } from "@octokit/graphql"
import { existsSync } from "fs-extra"
import fetch from "node-fetch"
import { asserted } from "@re-do/utils"
import {
    makeExecutable,
    REDO_EXECUTABLE,
    EXECUTABLE_SUFFIX,
    streamToFile
} from "@re-do/utils/dist/node"

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

const assertResult = <T>(value: T) =>
    asserted<T>(value, "Unable to find the latest Redo installation.")

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
    const releases: any[] = assertResult(
        releasesResult?.repository?.releases?.nodes
    )
    const latestRelease = releases.find(
        release => !release.isDraft && !release.isPrerelease
    )
    const assetsResult = await query(assetsQuery, {
        tag: assertResult(latestRelease).tagName
    })
    const assets: any[] = assertResult(
        assetsResult?.repository?.release?.releaseAssets?.nodes
    )
    const assetUrl: string = assertResult(
        assets.find(asset => asset.name.endsWith(EXECUTABLE_SUFFIX))?.url
    )
    const { body } = await fetch(assertResult(assetUrl))
    makeExecutable(await streamToFile(body, REDO_EXECUTABLE))
    console.log(`Succesfully installed Redo (${latestRelease.tagName})!`)
    return REDO_EXECUTABLE
}

export const getPath = async (): Promise<string> =>
    existsSync(REDO_EXECUTABLE) ? REDO_EXECUTABLE : await install()

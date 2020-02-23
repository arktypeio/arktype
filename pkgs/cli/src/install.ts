import { graphql } from "@octokit/graphql"

const token = "096db3d06fe940038b953e2cd886b790e13a2fac"

const recentReleasesQuery = `
query{
  repository(name: "redo", owner: "redo-qa") {
    releases(last: 5) {
    	nodes{
        tagName
        isDraft
        isPrerelease
      }
    }
  }
}
`

export const install = async () => {
    const query = graphql.defaults({
        headers: {
            authorization: `token ${token}`
        }
    })
    const releases: any[] | undefined = (
        await query({
            query: recentReleasesQuery
        })
    )?.repository?.releases?.nodes

    result!.repository.releases.filter()
}

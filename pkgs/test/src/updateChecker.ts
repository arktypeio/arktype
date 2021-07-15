import { Octokit } from "@octokit/rest"

const latestRelease = async () => {
    const gitHub = new Octokit().rest
    const { data } = await gitHub.repos.getLatestRelease({
        owner: "re-do",
        repo: "redo"
    })
    return data
}

export const promptIfNewReleaseAvailable = async (version: string) => {
    const { tag_name } = await latestRelease()
    if (`v${version}` !== tag_name) {
        console.log(
            `${tag_name} is available to download! (npm i re-do/test@latest)`
        )
    }
}

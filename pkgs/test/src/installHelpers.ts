import { Octokit } from "@octokit/rest"

export const latestVersionAvailable = async () => {
    const gitHub = new Octokit().rest
    const {data} = await gitHub.repos.getLatestRelease({
        owner: "re-do",
        repo: "redo"
    })
    return data.tag_name.trim().substring(1)
}

export const isNewVersionAvailable = async (current:string) => {
    const latestVersion = await latestVersionAvailable()
    return isCurrentVersionOutdated(current, latestVersion) ? {release: latestVersion, outdated: true} : {outdated:false}
}

export const isCurrentVersionOutdated = (current:string, comparitor:string) => {
    const v1 = versionStringToArray(comparitor)
    const v2 = versionStringToArray(current)
    for (let i = 0; i < v1.length; i++) {
        if(parseInt(v1[i]) > parseInt(v2[i]) && (parseInt(v2[i]) !== parseInt(v1[i]))) {
            return true
        }
    }
    return false
}

const versionStringToArray = (version: string) => {
    return version.trim().split(".")
}

export const extractVersionFromDirString = (dir: string) => {
    const matchVersionRegex = /\.redo\/((\d[0-9]?\.){2}\d[0-9]?)/g
    const vers = dir.match(matchVersionRegex)?.toString().split("/")[1]
    return vers
}

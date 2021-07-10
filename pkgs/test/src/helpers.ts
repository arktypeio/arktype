import { Octokit } from "@octokit/rest"
import { version } from "./install"

/* 
    Might need to get into specifics. Since there's a chance a release 
    may only be available for a certain os until it's automated.
*/
export const latestVersionAvailable = async () => {
    const gitHub = new Octokit().rest
    const {data} = await gitHub.repos.listReleases({
        owner: "re-do",
        repo: "redo"
    })
    return data[0]
}

//assumes versions will always be in the form of x.x.x
export const isCurrentPackageOutdated = async () => {
    const latestVersion = await latestVersionAvailable()
    const v1 = versionStringToArray(latestVersion.tag_name.substring(1))
    const v2 = versionStringToArray(version)
    for(let i = 0; i < v1.length; i++){
        if (parseInt(v2[i]) > parseInt(v1[i])){
            return false
        }
    }
    return true  
}
const versionStringToArray = (version:string) => {
    return version.trim().split(".")
}
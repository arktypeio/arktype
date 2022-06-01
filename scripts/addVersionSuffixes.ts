/** Changesets will remove version suffixes like -alpha by default, so we use this to preserve them */
import { fromHere, rewriteJson } from "../@re-/node/src/index.js"

const suffixes = {
    model: "alpha"
}

for (const [name, suffix] of Object.entries(suffixes)) {
    rewriteJson(fromHere("..", "@re-", name, "package.json"), (data: any) => {
        if (!data.version.endsWith(suffix)) {
            data.version += `-${suffix}`
        }
        return data
    })
}

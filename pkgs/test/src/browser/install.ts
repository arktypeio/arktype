// import { chmodSync, existsSync, ensureDirSync } from "fs-extra"
// import { BrowserFetcher } from "playwright-core/lib/server/browserFetcher"
// import { fromRedo } from "@re-do/utils/dist/node"

// const chromiumDir = fromRedo("chromium")
// ensureDirSync(chromiumDir)
// const browserFetcher = new BrowserFetcher(chromiumDir)

// export const installChromium = async () => {
//     console.log(`Updating your Chromium installation to ${targetRevision}...`)
//     await removeExistingRevisions()
//     await browserFetcher.download(targetRevision)
//     const chromiumPath = getChromiumPath({ errorOnNonexistent: true })!
//     // Ensure the new Chromium installation is executable
//     chmodSync(chromiumPath, "755")
//     console.log(`Successfully installed Chromium reivsion ${targetRevision}.`)
//     return chromiumPath
// }

// export type GetChromiumPathOptions = {
//     errorOnNonexistent?: boolean
// }

// /*
//     Append the end of the path where puppeteer would normally install Chromium (in node_modules)
//     to Redo's dedicated chromiumDir.
// */
// export const getChromiumPath = (options?: GetChromiumPathOptions) => {
//     const pathFromChromium = p.executablePath().split(".local-chromium")[1]
//     const expectedLocation = join(chromiumDir, pathFromChromium)
//     if (!existsSync(expectedLocation)) {
//         if (options?.errorOnNonexistent) {
//             throw new Error(
//                 `Did not find a Chromium instance at the expected path (${expectedLocation}).`
//             )
//         }
//         return null
//     }
//     return expectedLocation
// }

// export const ensureChromiumPath = async () =>
//     getChromiumPath() ?? (await installChromium())

// const removeExistingRevisions = async () => {
//     const existingRevisions = await browserFetcher.localRevisions()
//     for (const revision of existingRevisions) {
//         console.log(`Deleting old Chromium (revision ${revision})...`)
//         await browserFetcher.remove(revision)
//     }
// }

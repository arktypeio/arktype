import { stringify } from "@re-do/utils"
import tsd from "tsd"
import { fromHere, getCaller, writeFile } from "@re-do/node"
import {} from "tsd/dist/lib/formatter"

// export default async () => {
//     const typeData = await tsd({
//         cwd: ".",
//         testFiles: ["src/__tests__/**/*.test.ts"]
//     })

//     writeFile(
//         fromHere("src", "__tests__", "tsd.json"),
//         stringify(typeData, { indent: 4 })
//     )
// }

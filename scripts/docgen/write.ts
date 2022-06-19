import { ExtractedData } from "./extract.js"

export const writeDocData = (data: ExtractedData) => {
    for (const entryPoint of data) {
        for (const exported of entryPoint.exports) {
            console.log(exported)
        }
    }
}

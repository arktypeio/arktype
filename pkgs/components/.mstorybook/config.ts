// import { configure, addDecorator } from "@storybook/react"
// import { withWrapper } from "./wrapper"

// /*
// When running in webpack, storybook doesn't have access to filesystem.
// It uses webpack's require.context, but that's not available in jest
// for storyshots. This solution ensures we find stories in the filesystem
// oureselves when running tests, while storybook relies on webpack.
// */
// const loadStories =
//     process.env.NODE_ENV === "test"
//         ? () => {
//               const { walkPaths } = require("redo-utils/dist/fsUtils") as {
//                   walkPaths: (dir: string) => string[]
//               }
//               const { resolve } = require("path")
//               walkPaths(resolve(__dirname, "..", "src")).forEach(path => {
//                   if (path.match(/\.stories.tsx$/)) {
//                       require(path)
//                   }
//               })
//           }
//         : () => {
//               const req = require.context("../src", true, /\.stories.tsx$/)
//               req.keys().forEach((file: string) => req(file))
//           }

// configure(loadStories, module)
// addDecorator(withWrapper)

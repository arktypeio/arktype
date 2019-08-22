import { configure } from "@storybook/react"
import { withWrapper } from "./wrapper"

const loadStories = require.context
    ? () => {
          const req = require.context("../src", true, /\.stories.tsx$/)
          return () => req.keys().forEach((file: string) => req(file))
      }
    : () => {
          const { walkPaths } = require("redo-utils/dist/fsUtils") as {
              walkPaths: (dir: string) => string[]
          }
          const { resolve } = require("path")
          walkPaths(resolve(__dirname, "..", "src")).forEach(path => {
              if (path.match(/\.stories.tsx$/)) {
                  require(path)
              }
          })
      }
configure(loadStories, module)
withWrapper()

import { resolve } from "path"
import { makeConfig } from "redo-bundle"

const isDev = process.env.NODE_ENV === "development"

export default makeConfig(
    {
        base: "web",
        entry: [resolve(__dirname, "src", "index.tsx")],
        devServer: isDev
    },
    isDev
        ? [
              {
                  devServer: {
                      open: true
                  }
              } as any
          ]
        : undefined
)

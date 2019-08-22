import { resolve } from "path"
import { makeConfig, isDev } from "redo-bundle"

export default makeConfig(
    {
        base: "web",
        entry: resolve(__dirname, "src", "index.tsx"),
        tsconfig: resolve(__dirname, "tsconfig.json"),
        devServer: isDev()
    },
    isDev()
        ? [
              {
                  devServer: {
                      open: true
                  }
              } as any
          ]
        : undefined
)

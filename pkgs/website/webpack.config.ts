import { resolve } from "path"
import { makeConfig, isDev } from "@re-do/bundle"

export default makeConfig(
    {
        base: "web",
        entry: resolve(__dirname, "src", "index.tsx"),
        tsconfig: resolve(__dirname, "tsconfig.json"),
        devServer: isDev()
    },

    [
        {
            output: {
                publicPath: "/"
            }
        },
        isDev()
            ? ({
                  devServer: {
                      open: true
                  }
              } as any)
            : undefined
    ]
)

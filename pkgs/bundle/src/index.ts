import { resolve } from "path"
import { spawn } from "child_process"
import HtmlWebpackPlugin from "html-webpack-plugin"
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin"
import isWsl from "is-wsl"
import { merge } from "webpack-merge"
import {
    Configuration,
    IgnorePlugin,
    HotModuleReplacementPlugin,
    NoEmitOnErrorsPlugin,
    ProvidePlugin
} from "webpack"
import { listify } from "@re-do/utils"
import { getMode, isDev } from "@re-do/utils/dist/node"
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin"
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer"

export type ConfigArgs = {
    entries: string[]
    tsconfig: string
    analyzeBundle: boolean
}

const getPlugins = (tsconfig: string, analyze?: boolean) => {
    const plugins = [
        new ForkTsCheckerWebpackPlugin({
            typescript: { configFile: tsconfig }
        })
    ]
    if (analyze) {
        plugins.push(new BundleAnalyzerPlugin() as any)
    }
    return plugins
}

const getCommonConfig = ({
    entries,
    tsconfig,
    analyzeBundle
}: ConfigArgs): Configuration => ({
    mode: getMode(),
    entry: entries,
    devtool: isDev() ? "inline-source-map" : "source-map",
    context: resolve(__dirname, ".."),
    performance: {
        hints: isDev() && "warning"
    },
    node: {
        __dirname: false,
        __filename: false
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
        plugins: [new TsconfigPathsPlugin() as any],
        alias: {
            ws: "isomorphic-ws"
        },
        fallback: {
            events: "events"
        }
    },
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                loader: "babel-loader",
                exclude: /node_modules/
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.(graphql|gql)$/,
                exclude: /node_modules/,
                loader: "graphql-tag/loader"
            }
        ]
    },
    plugins: getPlugins(tsconfig, analyzeBundle)
})

const getFrontendConfig = (args: ConfigArgs): Configuration =>
    merge(getCommonConfig(args), {
        module: {
            rules: [
                {
                    test: /\.(jpg|png|ico|icns|woff|woff2)$/,
                    loader: "url-loader"
                },
                {
                    test: /\.svg$/,
                    use: [
                        {
                            loader: "babel-loader"
                        },
                        {
                            loader: "react-svg-loader",
                            options: {
                                jsx: true
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: [{ loader: "style-loader" }, { loader: "css-loader" }]
                },
                {
                    test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
                    resolve: {
                        aliasFields: ["main"]
                    }
                }
            ]
        },
        output: {
            publicPath: "/"
        },
        resolve: {
            alias: {
                "react-hot-loader": resolve(
                    __dirname,
                    "..",
                    "node_modules",
                    "react-hot-loader"
                )
            }
        },
        plugins: [
            new IgnorePlugin({
                checkResource: (name) =>
                    name.includes("iconv-loader") || name.endsWith(".exe")
            }),
            new HtmlWebpackPlugin({
                template: resolve(__dirname, "template.html")
            })
        ]
    })

const getWebConfig = (args: ConfigArgs): Configuration =>
    merge(getFrontendConfig(args), {
        plugins: [
            new ProvidePlugin({
                process: "process/browser",
                Buffer: ["buffer", "Buffer"]
            })
        ]
    })

const getMainConfig = (args: ConfigArgs): Configuration =>
    merge(getCommonConfig(args), {
        target: "electron-main",
        output: {
            filename: "main.js"
        }
    })

const getRendererConfig = (args: ConfigArgs): Configuration =>
    merge(getFrontendConfig(args), {
        target: "electron-renderer",
        output: {
            filename: "renderer.js"
        },
        resolve: {
            /*
            Override default value ["browser"] since we have enabled node integration
            And have access to more than we would in a basic web environment.
            In particular, this allows us to import puppeteer, which specifies a 
            "browser" field in its package.json that breaks our ability to import it.
            */
            aliasFields: []
        },
        devServer: {
            after() {
                spawn("npm", ["run", "electron"], {
                    shell: true,
                    env: process.env,
                    stdio: "inherit"
                })
                    .on("close", (code) => process.exit(code ?? undefined))
                    .on("error", (spawnError) => console.error(spawnError))
            }
        }
    } as Configuration)

const getInjectedConfig = (args: ConfigArgs): Configuration =>
    merge(getFrontendConfig(args), {
        output: {
            filename: "injected.js"
        },
        module: {
            rules: [
                {
                    test: /\.(j|t)sx?$/,
                    loader: "ts-loader",
                    exclude: /node_modules/
                }
            ]
        }
    })

const getDevServerConfig = (customConfig?: object): Configuration =>
    ({
        resolve: {
            alias: {
                "react-dom": resolve(
                    __dirname,
                    "..",
                    "node_modules",
                    "@hot-loader",
                    "react-dom"
                )
            }
        },
        entry: [
            "react-hot-loader/patch",
            "webpack-dev-server/client?http://localhost:8080",
            "webpack/hot/only-dev-server"
        ],
        plugins: [new HotModuleReplacementPlugin(), new NoEmitOnErrorsPlugin()],
        devServer: {
            historyApiFallback: true,
            hot: true,
            writeToDisk: true,
            host: isWsl ? "0.0.0.0" : undefined,
            useLocalIp: isWsl,
            ...customConfig
        }
    } as Configuration)

const baseOptions = {
    common: getCommonConfig,
    web: getWebConfig,
    injected: getInjectedConfig,
    renderer: getRendererConfig,
    main: getMainConfig
}

export type BaseName = keyof typeof baseOptions

export type BaseConfigOptions = {
    base: BaseName
    entry: string | string[]
    tsconfig: string
    devServer?: object
    analyzeBundle?: boolean
}

export const makeConfig = (
    {
        base,
        entry,
        tsconfig,
        devServer,
        analyzeBundle = false
    }: BaseConfigOptions,
    merged: Partial<Configuration>[] = []
) =>
    merge(
        baseOptions[base]({ entries: listify(entry), tsconfig, analyzeBundle }),
        devServer ? getDevServerConfig(devServer) : {},
        ...merged
    )

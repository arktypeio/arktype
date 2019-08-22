import { resolve } from "path"
import { spawn } from "child_process"
import HtmlWebpackPlugin from "html-webpack-plugin"
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin"
import merge from "webpack-merge"
import {
    Configuration,
    IgnorePlugin,
    NamedModulesPlugin,
    HotModuleReplacementPlugin,
    NoEmitOnErrorsPlugin
} from "webpack"
import { listify, fromEntries } from "redo-utils"
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin"

const getMode = () =>
    process.env.NODE_ENV === "development" ? "development" : "production"

export const isDev = () => getMode() === "development"
export const isProd = () => getMode() === "production"

export type ConfigArgs = {
    entries: string[]
    tsconfig: string
}

const getCommonConfig = ({ entries, tsconfig }: ConfigArgs): Configuration => ({
    mode: getMode(),
    entry: entries,
    devtool: isDev() ? "inline-source-map" : "source-map",
    context: resolve(__dirname, ".."),
    node: {
        __dirname: false,
        __filename: false
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
        plugins: [new TsconfigPathsPlugin()],
        alias: {
            ws: "isomorphic-ws"
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
                type: "javascript/auto",
                test: /\.mjs$/,
                use: []
            }
        ]
    },
    plugins: [new ForkTsCheckerWebpackPlugin({ tsconfig })]
})

const getWebConfig = (args: ConfigArgs): Configuration =>
    merge.smart(getCommonConfig(args), {
        module: {
            rules: [
                {
                    test: /\.(jpg|png|ico|icns|woff|woff2)$/,
                    loader: "file-loader"
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
                    loaders: ["style-loader", "css-loader"]
                },
                {
                    test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
                    resolve: {
                        aliasFields: ["main"]
                    }
                }
            ]
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
            new IgnorePlugin(/\/iconv-loader$/),
            new HtmlWebpackPlugin({
                template: resolve(__dirname, "template.html")
            })
        ]
    })

const getMainConfig = (args: ConfigArgs): Configuration =>
    merge.smart(getCommonConfig(args), {
        target: "electron-main",
        output: {
            filename: "main.js"
        }
    })

const getRendererConfig = (args: ConfigArgs): Configuration =>
    merge.smart(getWebConfig(args), {
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
                    .on("close", code => process.exit(code))
                    .on("error", spawnError => console.error(spawnError))
            }
        }
    } as Configuration)

const getInjectedConfig = (args: ConfigArgs): Configuration =>
    merge.smart(getWebConfig(args), {
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

const getDevServerConfig = (): Configuration =>
    ({
        resolve: {
            alias: {
                "react-dom": resolve(
                    __dirname,
                    "..",
                    "node_modules",
                    "@hot-loader/react-dom"
                )
            }
        },
        entry: [
            "react-hot-loader/patch",
            "webpack-dev-server/client?http://localhost:8080",
            "webpack/hot/only-dev-server"
        ],
        plugins: [
            new NamedModulesPlugin(),
            new HotModuleReplacementPlugin(),
            new NoEmitOnErrorsPlugin()
        ],
        devServer: {
            historyApiFallback: true,
            hot: true,
            writeToDisk: true,
            host: "0.0.0.0",
            useLocalIp: true
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
    devServer?: boolean
}

export const makeConfig = (
    { base, entry, tsconfig, devServer }: BaseConfigOptions,
    merged: Partial<Configuration>[] = []
) =>
    merge.smart(
        baseOptions[base]({ entries: listify(entry), tsconfig }),
        devServer ? getDevServerConfig() : {},
        ...merged
    )

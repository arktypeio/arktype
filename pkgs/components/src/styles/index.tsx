import React from "react"
import createMuiTheme, {
    ThemeOptions
} from "@material-ui/core/styles/createMuiTheme"
import { ThemeProvider } from "@material-ui/styles"
import { useTheme as useMuiTheme } from "@material-ui/styles"
export { makeStyles, ThemeProvider } from "@material-ui/styles"

export const defaultConfig: ThemeOptions = {
    palette: {
        primary: {
            main: "#2979ff"
        },
        secondary: {
            main: "#ffc400"
        }
    },
    typography: {
        fontFamily: "Ubuntu",
        button: {
            textTransform: "none"
        }
    }
}

export const makeTheme = createMuiTheme
export const defaultTheme = createMuiTheme(defaultConfig)
export const DefaultTheme = ({ children }: any) => (
    <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
)
export const T = DefaultTheme
export type Theme = typeof defaultTheme
export const useTheme = () => useMuiTheme<typeof defaultTheme>()
export const usePalette = () => useTheme().palette

import "./fonts"
import createMuiTheme, {
    ThemeOptions
} from "@material-ui/core/styles/createMuiTheme"
import { useTheme as useMuiTheme } from "@material-ui/styles"
export { makeStyles } from "@material-ui/styles"

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

export const defaultTheme = createMuiTheme(defaultConfig)
export type Theme = typeof defaultTheme
export const useTheme = () => useMuiTheme<typeof defaultTheme>()
export const usePalette = () => useTheme().palette

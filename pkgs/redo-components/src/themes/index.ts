import createMuiTheme, {
    ThemeOptions
} from "@material-ui/core/styles/createMuiTheme"
import { useTheme as useMuiTheme } from "@material-ui/styles"

export const defaultConfig: ThemeOptions = {
    palette: {
        type: "light",
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

export const useTheme = () => useMuiTheme<typeof defaultTheme>()
export const usePalette = () => useTheme().palette

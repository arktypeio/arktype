import { createTheme } from "@mui/material"

declare module "@mui/material" {
    interface Palette {
        accent: Palette["primary"]
    }

    interface PaletteOptions {
        accent: PaletteOptions["primary"]
    }
}

export type ThemeConfigOptions = {
    isDark: boolean
}
export const activeColorLightMode = "#eef1fc"
const font = "'Ubuntu', sans-serif"

export const getTheme = ({ isDark }: ThemeConfigOptions) =>
    createTheme({
        palette: {
            primary: {
                main: isDark ? "#264bcf" : "#162b79",
                light: "#eef1fc"
            },
            secondary: {
                main: "#ffc40c"
            },
            // @ts-ignore
            accent: {
                main: "#c80815"
            },
            // @ts-ignore
            activeDemo: {
                activeColor: activeColorLightMode,
                activeText: "#000"
            }
        },
        typography: {
            fontFamily: font
        }
    })

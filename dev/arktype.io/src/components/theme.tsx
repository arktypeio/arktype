import { createTheme, responsiveFontSizes } from "@mui/material"

export type ThemeConfigOptions = {
    isDark: boolean
}

export const getTheme = () =>
    responsiveFontSizes(
        createTheme({
            palette: {
                primary: {
                    main: "#085b92",
                    light: "#80cff8"
                    // Occasionally "#009EFF" is used, e.g. in GIF title bars.
                    // Not sure if/where that belongs yet.
                },
                secondary: {
                    main: "#eb9f2e",
                    dark: "#4b3621",
                    light: "#f5cf8f"
                },
                common: {
                    white: "#fffff0",
                    black: "#1b1b1b"
                }
            },
            typography: {
                fontFamily: "'Raleway', sans-serif"
            }
        })
    )

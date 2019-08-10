import "typeface-ubuntu"
import { createContext } from "react"

export type AppState = {
    contentHeight?: number
}

export const AppStateContext = createContext<AppState>({})

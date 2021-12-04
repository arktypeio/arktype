import { stateSyncEnhancer } from "electron-redux/renderer"
import { Root } from "common"
import { Store } from "react-statelessly"

export const store = new Store(
    {} as Root,
    {},
    {
        reduxOptions: {
            enhancers: (enhancers) => [stateSyncEnhancer()].concat(enhancers)
        }
    }
)

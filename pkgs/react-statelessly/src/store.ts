import { useContext } from "react"
import { createStore as createBaseStore, StoreArgs } from "statelessly"
import { shapeFilter } from "@re-do/utils"
import { Store } from "./utils"
import { StatelessContext } from "./context"

export const createStore = <T extends any>(args: StoreArgs<T>): Store<T> => {
    const store = createBaseStore(args)
    return {
        ...store,
        useQuery: q => shapeFilter(useContext(StatelessContext), q)
    }
}

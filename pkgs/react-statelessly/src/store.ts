import { useContext } from "react"
import {
    createStore as createBaseStore,
    Actions,
    StoreOptions,
    Query
} from "statelessly"
import { shapeFilter, valueAtPath } from "@re-do/utils"
import { Store } from "./utils"
import { StatelessContext } from "./context"

export const createStore = <T extends object, A extends Actions<T>>(
    initial: T,
    actions: A,
    options: StoreOptions<T> = {}
) => {
    const store = createBaseStore(initial, actions, options)
    return {
        ...store,
        useQuery: (q: Query<T>) => shapeFilter(useContext(StatelessContext), q),
        // any types are a temporary workaround for excessive stack depth on type comparison error in TS
        useGet: ((path: any) =>
            valueAtPath(useContext(StatelessContext), path)) as any,
        useGetState: () => useContext(StatelessContext)
    } as Store<T, A>
}

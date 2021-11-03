import { useContext } from "react"
import { Store as BaseStore, Actions, Query } from "statelessly"
import { shapeFilter, valueAtPath } from "@re-do/utils"
import { StatelessContext } from "./context.js"

export class Store<T extends object, A extends Actions<T>> extends BaseStore<
    T,
    A
> {
    useQuery: BaseStore<T, A>["query"] = (q: Query<T>) =>
        shapeFilter(useContext(StatelessContext), q)

    useGet: BaseStore<T, A>["get"] = (path: any) =>
        // @ts-ignore
        valueAtPath(useContext(StatelessContext), path)

    useGetState: BaseStore<T, A>["getState"] = () =>
        useContext(StatelessContext)
}

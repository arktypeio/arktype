import { useContext } from "react"
import { Store as BaseStore, Actions, Query, Paths } from "statelessly"
import { shapeFilter, valueAtPath } from "@re-do/utils"
import { StatelessContext } from "./context.js"

export class Store<
    T extends object,
    A extends Actions<T, AddIdPaths, IdFieldName>,
    AddIdPaths extends Paths<T>,
    IdFieldName extends string
> extends BaseStore<T, A, AddIdPaths, IdFieldName> {
    useQuery: BaseStore<T, A, AddIdPaths, IdFieldName>["query"] = (
        q: Query<T>
    ) => shapeFilter(useContext(StatelessContext), q)

    useGet: BaseStore<T, A, AddIdPaths, IdFieldName>["get"] = ((path: any) =>
        valueAtPath(useContext(StatelessContext), path)) as any

    useGetState: BaseStore<T, A, AddIdPaths, IdFieldName>["getState"] = () =>
        useContext(StatelessContext)
}

import { Store as BaseStore } from "statelessly"
import { ValueFrom } from "@re-do/utils"

export type Store<T> = BaseStore<T> & {
    useQuery: ValueFrom<BaseStore<T>, "query">
}

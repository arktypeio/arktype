import { Store as BaseStore } from "statelessly"
import { ValueFrom } from "@re-do/utils"

export type Store<T extends object> = BaseStore<T> & {
    useQuery: ValueFrom<BaseStore<T>, "query">
}

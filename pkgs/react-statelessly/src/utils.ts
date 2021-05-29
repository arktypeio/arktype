import { Store as BaseStore, Actions } from "statelessly"
import { ValueFrom } from "@re-do/utils"

export type Store<T extends object, A extends Actions<T>> = BaseStore<T, A> & {
    useQuery: ValueFrom<BaseStore<T, A>, "query">
}

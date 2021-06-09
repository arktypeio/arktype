import { BaseStore, Actions } from "react-statelessly"

export class LocalStore<
    T extends object,
    A extends Actions<T>
> extends BaseStore<T, A> {}

import { Fields, SubmissionState } from "@re-do/components"
import { MutationHookOptions, MutationTuple } from "@apollo/react-hooks"
import { OperationVariables } from "apollo-client"
import { DocumentNode } from "graphql"

export type UseMutation<TData = any, TVariables = OperationVariables> = (
    mutation: DocumentNode,
    options?: MutationHookOptions<TData, TVariables>
) => MutationTuple<TData, TVariables>

export type SubmitFormOptions<
    T extends Fields,
    D extends Record<string, any>
> = {
    submit: ReturnType<UseMutation<D, T>>[0]
    fields: T
}

export const submitForm = async <
    T extends Fields,
    D extends Record<string, any>
>({
    submit,
    fields
}: SubmitFormOptions<T, D>): Promise<SubmissionState<D>> => {
    const result = {} as SubmissionState<D>
    try {
        const submitResult = await submit({ variables: fields })
        if (submitResult && submitResult.data) {
            result.data = submitResult.data
        } else {
            result.errors = ["We called, but the server didn't pick up ☎️😞"]
        }
    } catch (e) {
        result.errors = [e.message]
    }
    return result
}

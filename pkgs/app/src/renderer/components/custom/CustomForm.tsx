import { Fields, FormErrors, ResponseState } from "@re-do/components"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"
import { MutationHookOptions, MutationTuple } from "@apollo/react-hooks"
import { OperationVariables } from "apollo-client"
import { DocumentNode } from "graphql"

export type UseMutation<TData = any, TVariables = OperationVariables> = (
    mutation: DocumentNode,
    options?: MutationHookOptions<TData, TVariables>
) => MutationTuple<TData, TVariables>

export const createValidator = <T extends Fields>(against: T) => (
    values: T
) => {
    // Translate class-validator style errors to a map of fields to error string arrays.
    const classValidatorErrors = validateSync(
        plainToClassFromExist(against, values)
    )
    return classValidatorErrors.reduce(
        (errors, current) => {
            return {
                ...errors,
                ...{
                    ...{
                        [current.property]: Object.values(current.constraints)
                    }
                }
            }
        },
        {} as FormErrors<T>
    )
}

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
}: SubmitFormOptions<T, D>): Promise<ResponseState<D>> => {
    const result = {} as ResponseState<D>
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

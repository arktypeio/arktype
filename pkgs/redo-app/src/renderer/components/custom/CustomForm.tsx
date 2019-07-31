import { Fields, FormErrors } from "redo-components"
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

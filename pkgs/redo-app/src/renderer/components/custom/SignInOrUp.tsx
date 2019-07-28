import React from "react"
import { component, FormSubmitProps } from "blocks"
import { Mutation } from "react-apollo"
import { Session, SignInInput } from "redo-model"
import gql from "graphql-tag"
import { Theme } from "@material-ui/core"

// import { MutationProps } from "./Mutation"
import { motion, AnimatePresence } from "framer-motion"
import { makeStyles } from "@material-ui/styles"

import {
    Form,
    FormSubmit,
    ResponseState,
    Column,
    FormText,
    Fields,
    FormErrors
} from "redo-components"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"
import { SignIn } from "renderer/pages"

const stylize = makeStyles((theme: Theme) => ({
    fields: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-around"
    }
}))

const createValidator = <T extends Fields>(against: T) => (values: T) => {
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

const validate = createValidator(new SignInInput())

export const SignInOrUp = ({ children }: any) => {
    const { fields } = stylize()
    return (
        // I can't believe it's not butter! Ie check that this actually works...

        <Form<SignInInput> submit={submit} validate={validate}>
            {children}
        </Form>
    )
}

const submit: (fields: Fields) => Promise<ResponseState> = async <
    T extends string
>(
    fields: Fields
) => {
    return {
        data: "str",
        loading: true,
        errors: []
    }
}

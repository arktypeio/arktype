import React, { FC } from "react"
import { Theme } from "@material-ui/core/styles"
import { makeStyles } from "@material-ui/styles"
import useForm, { FormContext } from "react-hook-form"
import { FormActions } from "./FormContext"

const stylize = (theme: Theme) => makeStyles({})

export type FormProps = FormActions & {}

export const Form: FC<FormProps> = ({ children, validate, submit }) => (
    <FormContext validate={validate} submit={submit} {...useForm()}>
        {children}
    </FormContext>
)

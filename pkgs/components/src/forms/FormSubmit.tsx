import React, { cloneElement, MouseEvent } from "react"
import { useFormContext } from "./FormContext"

export type FormSubmitProps = {
    children: JSX.Element
}

export const FormSubmit = ({ children, ...rest }: FormSubmitProps) => {
    const {
        submit,
        handleSubmit,
        formState: { errors }
    } = useFormContext()
    const onClick = (e: MouseEvent) => {
        children.props.onClick && children.props.onClick(e)
        handleSubmit(submit)
    }
    return cloneElement(children, {
        style: { alignSelf: "center", ...children.props.style },
        ...rest,
        onClick,
        type: "submit"
    })
}

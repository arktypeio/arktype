import React, { FC, useState } from "react"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"
import { BaseTextFieldProps as MuiTextFieldProps } from "@material-ui/core/TextField"
import { TextField } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { makeKinds, KindFrom } from "../../common"

const stylize = makeStyles((theme: Theme) => ({
    defaultClass: { borderColor: theme.palette.primary.dark },
    errorClass: { borderColor: theme.palette.error.main },
    focusedClass: { borderColor: theme.palette.secondary.main },
    hoveredClass: { borderColor: theme.palette.primary.light }
}))

const getBorderClass = (state: TextInputState) => {
    const { defaultClass, errorClass, focusedClass, hoveredClass } = stylize()
    const { focused, hovered, error } = state
    return focused
        ? focusedClass
        : error
        ? errorClass
        : hovered
        ? hoveredClass
        : defaultClass
}

const useKind = makeKinds<MuiTextFieldProps>()((state: TextInputState) => ({
    outlined: {
        variant: "outlined",
        InputProps: {
            classes: {
                notchedOutline: getBorderClass(state)
            }
        }
    },
    underlined: {
        variant: "standard"
    }
}))

type TextInputState = {
    focused: boolean
    hovered: boolean
    error: boolean
}

export type TextInputProps = MuiTextFieldProps & {
    kind?: KindFrom<typeof useKind>
}

export const TextInput: FC<TextInputProps> = ({
    kind = "outlined",
    ...rest
}) => {
    const theme = useTheme<Theme>()
    const [state, setState] = useState({
        focused: false,
        error: false,
        hovered: false
    })
    const kindProps = useKind(kind, state)
    console.log(kindProps)
    return (
        <TextField
            margin="dense"
            onFocus={() => setState({ ...state, focused: true })}
            onBlur={() => setState({ ...state, focused: false })}
            onError={() => setState({ ...state, error: true })}
            onReset={() => setState({ ...state, error: false })}
            onMouseOver={() => setState({ ...state, hovered: true })}
            onMouseOut={() => setState({ ...state, hovered: false })}
            InputLabelProps={{
                style: {
                    color: state.focused
                        ? theme.palette.primary.dark
                        : theme.palette.primary.light
                }
            }}
            {...kindProps as any}
            {...rest}
        />
    )
}

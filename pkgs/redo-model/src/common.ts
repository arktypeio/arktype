import { InputType, ArgsType } from "type-graphql"
import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    IsNotEmpty,
    IsEmail
} from "class-validator"

export const EqualsProperty = (
    property: string,
    validationOptions?: ValidationOptions
) => (target: object, key: string) =>
    registerDecorator({
        name: "equalsProperty",
        target: target.constructor,
        propertyName: key,
        constraints: [property],
        options: validationOptions,
        validator: {
            validate(value: any, args: ValidationArguments) {
                const [relatedPropertyName] = args.constraints
                const relatedValue = (args.object as any)[relatedPropertyName]
                return value === relatedValue
            }
        }
    })

export const validatorMap = {
    isEmail: {
        validator: IsEmail,
        args: [{}, { message: "That doesn't look like a valid email." }]
    },
    notEmpty: {
        validator: IsNotEmpty,
        args: [
            {
                message: "Looks empty."
            }
        ]
    }
}

export const Validate = (
    ...validatorKeys: Array<keyof typeof validatorMap>
) => (target: object, key: string) =>
    validatorKeys.forEach(k => {
        const { validator, args } = validatorMap[k]
        validator(...args)(target, key)
    })

export const InType = () => (target: any) => {
    InputType()(target)
    ArgsType()(target)
}

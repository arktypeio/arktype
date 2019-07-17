import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments
} from "class-validator"
import { validate } from "validate.js"

export function EqualsProperty(
    property: string,
    validationOptions?: ValidationOptions
) {
    return function(object: Object, propertyName: string) {
        registerDecorator({
            name: "equalsProperty",
            target: object.constructor,
            propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints
                    const relatedValue = (args.object as any)[
                        relatedPropertyName
                    ]
                    return value === relatedValue
                }
            }
        })
    }
}

export function IsEmail(validationOptions?: ValidationOptions) {
    return function(object: Object, propertyName: string) {
        registerDecorator({
            name: "isEmail",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return !validate(
                        { email: value },
                        { email: { email: true } }
                    )
                }
            }
        })
    }
}

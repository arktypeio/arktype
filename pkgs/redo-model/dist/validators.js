"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_validator_1 = require("class-validator");
const validate_js_1 = require("validate.js");
function EqualsProperty(property, validationOptions) {
    return function (object, propertyName) {
        class_validator_1.registerDecorator({
            name: "equalsProperty",
            target: object.constructor,
            propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return value === relatedValue;
                }
            }
        });
    };
}
exports.EqualsProperty = EqualsProperty;
function IsEmail(validationOptions) {
    return function (object, propertyName) {
        class_validator_1.registerDecorator({
            name: "isEmail",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    return !validate_js_1.validate({ email: value }, { email: { email: true } });
                }
            }
        });
    };
}
exports.IsEmail = IsEmail;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy92YWxpZGF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscURBSXdCO0FBQ3hCLDZDQUFzQztBQUV0QyxTQUFnQixjQUFjLENBQzFCLFFBQWdCLEVBQ2hCLGlCQUFxQztJQUVyQyxPQUFPLFVBQVMsTUFBYyxFQUFFLFlBQW9CO1FBQ2hELG1DQUFpQixDQUFDO1lBQ2QsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDMUIsWUFBWTtZQUNaLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUN2QixPQUFPLEVBQUUsaUJBQWlCO1lBQzFCLFNBQVMsRUFBRTtnQkFDUCxRQUFRLENBQUMsS0FBVSxFQUFFLElBQXlCO29CQUMxQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO29CQUM5QyxNQUFNLFlBQVksR0FBSSxJQUFJLENBQUMsTUFBYyxDQUNyQyxtQkFBbUIsQ0FDdEIsQ0FBQTtvQkFDRCxPQUFPLEtBQUssS0FBSyxZQUFZLENBQUE7Z0JBQ2pDLENBQUM7YUFDSjtTQUNKLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQTtBQUNMLENBQUM7QUF0QkQsd0NBc0JDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLGlCQUFxQztJQUN6RCxPQUFPLFVBQVMsTUFBYyxFQUFFLFlBQW9CO1FBQ2hELG1DQUFpQixDQUFDO1lBQ2QsSUFBSSxFQUFFLFNBQVM7WUFDZixNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDMUIsWUFBWTtZQUNaLE9BQU8sRUFBRSxpQkFBaUI7WUFDMUIsU0FBUyxFQUFFO2dCQUNQLFFBQVEsQ0FBQyxLQUFVLEVBQUUsSUFBeUI7b0JBQzFDLE9BQU8sQ0FBQyxzQkFBUSxDQUNaLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUNoQixFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUM3QixDQUFBO2dCQUNMLENBQUM7YUFDSjtTQUNKLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQTtBQUNMLENBQUM7QUFqQkQsMEJBaUJDIn0=
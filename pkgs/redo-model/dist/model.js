"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const type_graphql_1 = require("type-graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const validators_1 = require("./validators");
let BrowserEvent = class BrowserEvent {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], BrowserEvent.prototype, "type", void 0);
__decorate([
    type_graphql_1.Field({ nullable: true }),
    __metadata("design:type", String)
], BrowserEvent.prototype, "selector", void 0);
__decorate([
    type_graphql_1.Field({ nullable: true }),
    __metadata("design:type", String)
], BrowserEvent.prototype, "value", void 0);
BrowserEvent = __decorate([
    type_graphql_1.ObjectType()
], BrowserEvent);
exports.BrowserEvent = BrowserEvent;
let Test = class Test {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], Test.prototype, "name", void 0);
__decorate([
    type_graphql_1.Field(type => [String]),
    __metadata("design:type", Array)
], Test.prototype, "tags", void 0);
__decorate([
    type_graphql_1.Field(type => [BrowserEvent]),
    __metadata("design:type", Array)
], Test.prototype, "steps", void 0);
Test = __decorate([
    type_graphql_1.ObjectType()
], Test);
exports.Test = Test;
let User = class User {
};
__decorate([
    type_graphql_1.Field(type => type_graphql_1.ID),
    __metadata("design:type", Object)
], User.prototype, "id", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    type_graphql_1.Field(type => [String]),
    __metadata("design:type", Array)
], User.prototype, "roles", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
User = __decorate([
    type_graphql_1.ObjectType()
], User);
exports.User = User;
let Session = class Session {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], Session.prototype, "token", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", User)
], Session.prototype, "user", void 0);
Session = __decorate([
    type_graphql_1.ObjectType()
], Session);
exports.Session = Session;
let SignInInput = class SignInInput {
};
__decorate([
    type_graphql_1.Field(),
    class_transformer_1.Expose(),
    validators_1.IsEmail({ message: "That doesn't look like a valid email." }),
    __metadata("design:type", String)
], SignInInput.prototype, "email", void 0);
__decorate([
    type_graphql_1.Field(),
    class_transformer_1.Expose(),
    class_validator_1.IsNotEmpty({ message: "Password is required." }),
    __metadata("design:type", String)
], SignInInput.prototype, "password", void 0);
SignInInput = __decorate([
    type_graphql_1.ArgsType(),
    type_graphql_1.InputType()
], SignInInput);
exports.SignInInput = SignInInput;
let SignUpInput = class SignUpInput extends SignInInput {
};
__decorate([
    type_graphql_1.Field(),
    class_transformer_1.Expose(),
    class_validator_1.IsNotEmpty({ message: "First name is required." }),
    __metadata("design:type", String)
], SignUpInput.prototype, "firstName", void 0);
__decorate([
    type_graphql_1.Field(),
    class_transformer_1.Expose(),
    class_validator_1.IsNotEmpty({ message: "Last name is required." }),
    __metadata("design:type", String)
], SignUpInput.prototype, "lastName", void 0);
__decorate([
    class_transformer_1.Expose(),
    validators_1.EqualsProperty("password", {
        message: "Those didn't match"
    }),
    __metadata("design:type", String)
], SignUpInput.prototype, "confirm", void 0);
SignUpInput = __decorate([
    type_graphql_1.ArgsType(),
    type_graphql_1.InputType()
], SignUpInput);
exports.SignUpInput = SignUpInput;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSw0QkFBeUI7QUFDekIsK0NBQXlFO0FBQ3pFLHFEQUE0QztBQUM1Qyx5REFBMEM7QUFDMUMsNkNBQXNEO0FBR3RELElBQWEsWUFBWSxHQUF6QixNQUFhLFlBQVk7Q0FTeEIsQ0FBQTtBQVBHO0lBREMsb0JBQUssRUFBRTs7MENBQ0k7QUFHWjtJQURDLG9CQUFLLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7OzhDQUNUO0FBR2pCO0lBREMsb0JBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQzs7MkNBQ1o7QUFSTCxZQUFZO0lBRHhCLHlCQUFVLEVBQUU7R0FDQSxZQUFZLENBU3hCO0FBVFksb0NBQVk7QUFZekIsSUFBYSxJQUFJLEdBQWpCLE1BQWEsSUFBSTtDQVNoQixDQUFBO0FBUEc7SUFEQyxvQkFBSyxFQUFFOztrQ0FDSTtBQUdaO0lBREMsb0JBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7O2tDQUNWO0FBR2Q7SUFEQyxvQkFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQzs7bUNBQ1Q7QUFSWixJQUFJO0lBRGhCLHlCQUFVLEVBQUU7R0FDQSxJQUFJLENBU2hCO0FBVFksb0JBQUk7QUFZakIsSUFBYSxJQUFJLEdBQWpCLE1BQWEsSUFBSTtDQWtCaEIsQ0FBQTtBQWhCRztJQURDLG9CQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBRSxDQUFDOztnQ0FDVTtBQUc1QjtJQURDLG9CQUFLLEVBQUU7O21DQUNLO0FBR2I7SUFEQyxvQkFBSyxFQUFFOztzQ0FDUTtBQUdoQjtJQURDLG9CQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzttQ0FDVDtBQUdmO0lBREMsb0JBQUssRUFBRTs7dUNBQ1M7QUFHakI7SUFEQyxvQkFBSyxFQUFFOztzQ0FDUTtBQWpCUCxJQUFJO0lBRGhCLHlCQUFVLEVBQUU7R0FDQSxJQUFJLENBa0JoQjtBQWxCWSxvQkFBSTtBQXFCakIsSUFBYSxPQUFPLEdBQXBCLE1BQWEsT0FBTztDQU1uQixDQUFBO0FBSkc7SUFEQyxvQkFBSyxFQUFFOztzQ0FDSztBQUdiO0lBREMsb0JBQUssRUFBRTs4QkFDRixJQUFJO3FDQUFBO0FBTEQsT0FBTztJQURuQix5QkFBVSxFQUFFO0dBQ0EsT0FBTyxDQU1uQjtBQU5ZLDBCQUFPO0FBVXBCLElBQWEsV0FBVyxHQUF4QixNQUFhLFdBQVc7Q0FVdkIsQ0FBQTtBQU5HO0lBSEMsb0JBQUssRUFBRTtJQUNQLDBCQUFNLEVBQUU7SUFDUixvQkFBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLENBQUM7OzBDQUNqRDtBQUtiO0lBSEMsb0JBQUssRUFBRTtJQUNQLDBCQUFNLEVBQUU7SUFDUiw0QkFBVSxDQUFDLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLENBQUM7OzZDQUNqQztBQVRQLFdBQVc7SUFGdkIsdUJBQVEsRUFBRTtJQUNWLHdCQUFTLEVBQUU7R0FDQyxXQUFXLENBVXZCO0FBVlksa0NBQVc7QUFjeEIsSUFBYSxXQUFXLEdBQXhCLE1BQWEsV0FBWSxTQUFRLFdBQVc7Q0FnQjNDLENBQUE7QUFaRztJQUhDLG9CQUFLLEVBQUU7SUFDUCwwQkFBTSxFQUFFO0lBQ1IsNEJBQVUsQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDOzs4Q0FDbEM7QUFLakI7SUFIQyxvQkFBSyxFQUFFO0lBQ1AsMEJBQU0sRUFBRTtJQUNSLDRCQUFVLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQzs7NkNBQ2xDO0FBTWhCO0lBSkMsMEJBQU0sRUFBRTtJQUNSLDJCQUFjLENBQUMsVUFBVSxFQUFFO1FBQ3hCLE9BQU8sRUFBRSxvQkFBb0I7S0FDaEMsQ0FBQzs7NENBQ2E7QUFmTixXQUFXO0lBRnZCLHVCQUFRLEVBQUU7SUFDVix3QkFBUyxFQUFFO0dBQ0MsV0FBVyxDQWdCdkI7QUFoQlksa0NBQVcifQ==
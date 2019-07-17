import "reflect-metadata";
export declare class BrowserEvent {
    type: string;
    selector?: string;
    value?: string;
}
export declare class Test {
    name: string;
    tags: string[];
    steps: BrowserEvent[];
}
export declare class User {
    readonly id: string | number;
    email: string;
    password: string;
    roles: string[];
    firstName: string;
    lastName: string;
}
export declare class Session {
    token: string;
    user: User;
}
export declare class SignInInput implements Partial<User> {
    email: string;
    password: string;
}
export declare class SignUpInput extends SignInInput implements Partial<User> {
    firstName: string;
    lastName: string;
    confirm: string;
}

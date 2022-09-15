export type Constrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = [Child, Constraints]

export type PossiblyConstrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Child | Constrained<Child, Constraints>

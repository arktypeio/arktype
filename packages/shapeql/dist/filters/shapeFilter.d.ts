export declare type ShapeFilter<O, S> = {
    [P in S extends object ? Extract<keyof O, keyof S> : keyof O]: O[P] extends object ? O[P] extends any[] ? O[P] : ShapeFilter<O[P], P extends keyof S ? S[P] : undefined> : O[P];
};
export declare const shapeFilter: <O, S>(o: O, shape: S) => ShapeFilter<O, S>;

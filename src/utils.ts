export const compose = <A> (...fns: Function[]) => (arg: A) => fns.reduceRight(
    (carry, fn: Function) => fn(carry),
    arg, 
);
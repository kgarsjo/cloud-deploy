export const compose = <A> (...fns: Function[]) => (arg: A) => fns.reduceRight(
    (carry, fn: Function) => fn(carry),
    arg, 
);

export const noop: (...args: any[]) => void = () => {};

export const once = (fn: Function, result?: any) => (...args: any[]) => {
    if (!result) result = fn(...args);
    return result;
}
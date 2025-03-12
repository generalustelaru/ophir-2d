/**
 *  @description
 * Creates a deep copy of the input. Prevents referencing the original object.
 */
function deepCopy<T>(input: T): T {

    if (typeof input !== 'object' || input === null) {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map(deepCopy) as T;
    }

    return Object.fromEntries(
        Object.entries(input).map(([key, value]) => [key, deepCopy(value)])
    ) as T;
}

// MARK: PRIMITIVES

export type Writable<T> = {
    exists: () => boolean,
    set: (newVal: T) => void,
    get: () => T,
    update: (fn: (val: T) => T) => void,
    reset: () => void,
}
/**
 * @description
 * Creates a writable store primitive which can be used as is or wrapped in a store object to improve readability, customize methods, and enforce typing.
 * The parameter is copied, not referenced. **The store value is mutable**, but only through the methods provided and it can only be retrieved as a copy.
 * @method is() returns true if the store has a value, false if it is null or undefined.
 * @method set() sets the store value to the input.
 * @method get() returns a copy of the store value.
 * @method update() sets the store value to the result of the input function, which takes the current store value as a parameter.
 * @method reset() sets the store value to the initial value.
*/
export function writable<T>(initialValue: T): Writable<T> {
    let value: T = deepCopy(initialValue);

    return {
        exists: () => typeof value !== 'undefined',
        set: (newVal: T) => value = deepCopy(newVal),
        get: () => deepCopy(value),
        update: (fn: Function): void => value = fn(deepCopy(value)),
        reset: () => value = deepCopy(initialValue),
    }
}

export type Readable<T> = {
    is: () => boolean,
    get: () => T,
}
/**
 * @description
 * Creates a readable store primitive which can be used as is or wrapped in a store object to improve readability, customize methods, and enforce typing.
 * The parameter is copied, not referenced. **The store value is immutable** and can only be retrieved as a copy.
 * @method is() returns true if the store has a value, false if it is null or undefined.
 * @method get() returns a copy of the store value.
*/
export function readable<T>(initialValue: T): Readable<T> {
    const value: T = deepCopy(initialValue);

    return {
        is: () => Boolean(value),
        get: () => deepCopy(value),
    }
}

// MARK: WRAPPERS

export type ArrayWritable<T> = {
    getAll: () => Array<T>,
    find: (id: string|number) => T | null,
    add: (element: T) => void,
    update: (id: string|number, element: T) => void,
    remove: (id: string|number) => void,
    reset: () => void,
}
export function arrayWritable<T>(initialArray: Array<T>, key?: string): ArrayWritable<T> {
    const array = writable(initialArray);

    return {
        getAll: () => array.get(),
        find: (id) => {
            return key
                ? array.get().find(e => e[key as keyof T] === id) || null
                : array.get().find(e => e === id) || null;
        },
        add: (element) => {
            array.update(arr => {
                arr.push(element);
                return arr;
            });
        },
        update: (id, element) => {
            array.update(arr => {
                const stateElement = key
                    ? arr.find(e => e[key as keyof T] === id)
                    : arr.find(e => e === id);
                if (stateElement)
                    arr.splice(arr.indexOf(stateElement), 1, element);
                return arr;
            });
        },
        remove: (id) => {
            array.update(arr => {
                const element = key
                    ? arr.find(e => e[key as keyof T] === id)
                    : arr.find(e => e === id);
                if (element)
                    arr.splice(arr.indexOf(element), 1);
                return arr;
            });
        },
        reset: () => array.reset(),
    }
}

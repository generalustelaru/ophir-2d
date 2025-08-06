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

    return Object.fromEntries(Object.entries(input).map(
        ([k, val]: [string, unknown]): [string, unknown] => [k, deepCopy(val)]
    )) as T;
}

function valueExists(value: unknown) {
    switch(true) {
        case typeof value == 'number':
            return true;
        case Array.isArray(value):
            return Boolean(value.length);
        default:
            return Boolean(value);
    }
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
 * @method exists() returns true if the store has a value. Returns false on null, undefined, empty string, and empty array. True on empty object.
 * @method set() sets the store value to the input.
 * @method get() returns a copy of the store value.
 * @method update() sets the store value to the result of the input function, which takes the current store value as a parameter.
 * @method reset() sets the store value to the initial value.
*/
export function writable<T>(initialValue: T): Writable<T> {
    let value: T = deepCopy(initialValue);

    return {
        exists: () => valueExists(value),
        set: (newVal: T) => value = deepCopy(newVal),
        get: () => deepCopy(value),
        update: (fn: Function): void => value = deepCopy(fn(deepCopy(value))),
        reset: () => value = deepCopy(initialValue),
    }
}

export type Readable<T> = {
    exists: () => boolean,
    get: () => T,
}
/**
 * @description
 * Creates a readable store primitive which can be used as is or wrapped in a store object to improve readability, customize methods, and enforce typing.
 * The parameter is copied, not referenced. **The store value is immutable** and can only be retrieved as a copy.
 * @method exists() returns true if the store has a value. Returns false on null, undefined, empty string, and empty array. True on empty object.
 * @method get() returns a copy of the store value.
*/
export function readable<T>(initialValue: T): Readable<T> {
    const value: T = deepCopy(initialValue);

    return {
        exists: () => valueExists(value),
        get: () => deepCopy(value),
    }
}

// MARK: WRAPPERS

export type ArrayReadable<T> = {
    count: () => number,
    getAll: () => Array<T>,
    findOne: (value: string|number) => T | null,
}

export function arrayReadable<T>(fixedArray: Array<T>, keyName?: keyof T): ArrayReadable<T> {
    const array = readable(fixedArray);
    return {
        count: () => array.get().length,
        getAll: () => deepCopy(fixedArray),
        findOne: (value) => {
            return keyName
                ? array.get().find(e => e[keyName] === value) || null
                : array.get().find(e => e === value) || null;
        },
    }
}

// TODO: transfomr this to take an index and (modyifying the internals into a record).
export type ArrayWritable<T> = {
    count: () => number,
    get: () => Array<T>,
    includes: (reference: string|number|null) => boolean,
    getOne: (reference: string|number) => T | null,
    addOne: (element: T) => void,
    updateOne: (reference: string|number, fn: (val: T) => T) => void,
    removeOne: (reference: string|number) => void,
    drawFirst: () => T | null,
    // drawLast: () => T,
    overwrite: (array: Array<T>) => void,
    clear: () => void,
    reset: () => void,
}

/**
 * @description Writable wrapper that implements array-specific methods.
 * @param initialArray May be empty.
 * @param key Unique object property used for searching. Unnecessary for scalar arrays.
 */
export function arrayWritable<T>(initialArray: Array<T>, key?: keyof T): ArrayWritable<T> {
    const array = writable(initialArray);

    return {
        count: () => array.get().length,
        get: () => array.get(),
        includes: (value) => {
            return key
                ? !!array.get().find(e => e[key] === value)
                : !!array.get().find(e => e === value);
        },
        getOne: (id) => {
            return deepCopy(key
                ? array.get().find(e => e[key] === id) || null
                : array.get().find(e => e === id) || null,
            );
        },
        addOne: (element) => {
            array.update(arr => {
                arr.push(element);
                return arr;
            });
        },
        updateOne: (reference, fn: (e: T) => T) => {
            array.update(arr => {
                const len = arr.length;
                for (let i = 0; i < len; i++) {
                    const e = deepCopy(arr[i]);
                    if (
                        key && e[key as keyof T] === reference
                        || !key && e === reference
                    ) {
                        arr[i] = deepCopy(fn((e)))
                        break;
                    }
                }

                return arr;
            });
        },
        removeOne: (id) => {
            array.update(arr => {
                const element = key
                    ? arr.find(e => e[key as keyof T] === id)
                    : arr.find(e => e === id);
                if (element)
                    arr.splice(arr.indexOf(element), 1);
                return arr;
            });
        },
        drawFirst: () => {
            const first = array.get().length ? array.get()[0] : null;
            array.update(a => { a.shift(); return a; });
            return first;
        },
        overwrite: (newArr) => {
            array.set(newArr);
        },
        clear: () => array.set([]),
        reset: () => array.reset(),
    }
}

import { useReducer, useRef, useLayoutEffect, useDebugValue } from "react";
import { produce, enablePatches } from "immer";

import { isFunction } from "../../utils/type-util";

enablePatches();

function createInternalStore(defaultState) {
    let state = defaultState;
    const listeners = new Set();

    return {
        defaultState,

        getState() {
            return state;
        },

        setState(partial, getPatches) {
            const nextState = isFunction(partial) ? produce(state, partial, getPatches) : partial;
            if (nextState !== state) {
                const prevState = state;
                state = nextState;
                listeners.forEach((fn) => fn(state, prevState));
            }
        },

        subscribe(selector, optListener, options) {
            let listener = selector;
            if (optListener) {
                const equalityFn = options?.equalityFn ?? Object.is;
                let currentSlice = selector(state);
                listener = (state) => {
                    const nextSlice = selector(state);
                    if (!equalityFn(currentSlice, nextSlice)) {
                        const prevSlice = currentSlice;
                        currentSlice = nextSlice;
                        optListener(currentSlice, prevSlice);
                    }
                };
                if (options?.fireImmediately) {
                    optListener(currentSlice, currentSlice);
                }
            }
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        destroy() {
            listeners.clear();
        },
    };
}

function createHook(store) {
    return (selector = store.getState, equalityFn = Object.is) => {
        const [, forceUpdate] = useReducer((c) => c + 1, 0);

        const state = store.getState();
        const stateRef = useRef(state);
        const selectorRef = useRef(selector);
        const equalityFnRef = useRef(equalityFn);
        const erroredRef = useRef(false);
        const currentSliceRef = useRef();

        if (currentSliceRef.current === undefined) {
            currentSliceRef.current = selector(state);
        }

        let newStateSlice;
        let hasNewStateSlice = false;

        // The selector or equalityFn need to be called during the render phase if they change.
        // We also want legitimate errors to be visible so we re-run them if they errored in the subscriber.
        if (
            stateRef.current !== state ||
            selectorRef.current !== selector ||
            equalityFnRef.current !== equalityFn ||
            erroredRef.current
        ) {
            // Using local variables to avoid mutations in the render phase
            newStateSlice = selector(state);
            hasNewStateSlice = !equalityFn(currentSliceRef.current, newStateSlice);
        }

        useLayoutEffect(() => {
            if (hasNewStateSlice) {
                currentSliceRef.current = newStateSlice;
            }
            stateRef.current = state;
            selectorRef.current = selector;
            equalityFnRef.current = equalityFn;
            erroredRef.current = false;
        });

        const stateBeforeSubscriptionRef = useRef(state);
        useLayoutEffect(() => {
            const listener = () => {
                try {
                    const nextState = store.getState();
                    const nextStateSlice = selectorRef.current(nextState);
                    if (!equalityFnRef.current(currentSliceRef.current, nextStateSlice)) {
                        stateRef.current = nextState;
                        currentSliceRef.current = nextStateSlice;
                        forceUpdate();
                    }
                } catch (error) {
                    erroredRef.current = true;
                    forceUpdate();
                }
            };
            const unsubscribe = store.subscribe(listener);
            if (store.getState() !== stateBeforeSubscriptionRef.current) {
                listener(); // state has changed before subscription
            }
            return unsubscribe;
        }, []);

        const sliceToReturn = hasNewStateSlice ? newStateSlice : currentSliceRef.current;
        useDebugValue(sliceToReturn);
        return sliceToReturn;
    };
}

export function createStore(defaultState) {
    const store = createInternalStore(defaultState);
    const useStore = createHook(store);
    return Object.assign(useStore, store);
}

import { useEffect } from "react";

import { createStore } from "./store";

const MAX_UNDO_DEPTH = 64;

export const useChanges = createStore({
    prev: [],
    next: [],
});

export function useUndoDepth() {
    return useChanges((s) => s.prev.length ?? 0);
}

export function useRedoDepth() {
    return useChanges((s) => s.next.length ?? 0);
}

export function usePatches(listener) {
    useEffect(() => {
        const unsubscribe = useChanges.subscribe(createListenerForPatches(listener));
        return () => {
            unsubscribe();
            clearChanges();
        };
    }, []);
}

export function createListenerForPatches(listener) {
    return (state, prevState) => {
        if (state.next.length > prevState.next.length && state.next.at(-1) === prevState.prev.at(-1)) {
            const { inversePatches } = state.next.at(-1);
            listener(inversePatches, "undo");
        } else if (state.prev.length > prevState.prev.length && state.prev.at(-1) === prevState.next.at(-1)) {
            const { patches } = state.prev.at(-1);
            listener(patches, "redo");
        } else if (state.prev.at(-1) !== prevState.prev.at(-1)) {
            const { patches } = state.prev.at(-1);
            listener(patches, "push");
        }
    };
}

export function pushChange({ patches, inversePatches }) {
    if (patches.length > 0) {
        useChanges.setState((state) => {
            if (state.prev.length === MAX_UNDO_DEPTH) {
                state.prev.shift();
            }
            state.prev.push({ patches, inversePatches });
            state.next = [];
        });
    }
}

export function undoChange() {
    useChanges.setState((state) => {
        if (state.prev.length > 0) {
            const changes = state.prev.pop();
            state.next.push(changes);
        }
    });
}

export function redoChange() {
    useChanges.setState((state) => {
        if (state.next.length > 0) {
            const changes = state.next.pop();
            state.prev.push(changes);
        }
    });
}

export function clearChanges() {
    useChanges.setState((state) => {
        state.prev = [];
        state.next = [];
    });
}

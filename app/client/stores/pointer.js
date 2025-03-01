import { createStore } from "./store";

export const usePointer = createStore({ position: [0, 0], mouseOver: false });

export function updatePointer(payload) {
    usePointer.setState((state) => {
        state.position[0] = payload.position[0];
        state.position[1] = payload.position[1];
        state.mouseOver = payload.mouseOver;
    });
}

import { createStore } from "./store";

export const useCanvasConfig = createStore({
    primaryColor: "#fbe64d",
    currentModifier: null,
});

export function setPrimaryColor(payload) {
    useCanvasConfig.setState((state) => {
        state.primaryColor = payload?.toLowerCase() ?? payload;
    });
}

export function setCurrentModifier(payload) {
    useCanvasConfig.setState((state) => {
        state.currentModifier = payload;
    });
}

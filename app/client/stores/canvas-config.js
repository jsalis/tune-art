import { createStore } from "./store";

export const useCanvasConfig = createStore({
    primaryColor: "#fbe64d",
    currentModifier: null,
    currentFlag: null,
});

export function setPrimaryColor(payload) {
    useCanvasConfig.setState((state) => {
        state.primaryColor = payload?.toLowerCase() ?? payload;
        state.currentFlag = null;
    });
}

export function setCurrentModifier(payload) {
    useCanvasConfig.setState((state) => {
        state.currentModifier = payload;
        state.currentFlag = null;
    });
}

export function setCurrentFlag(payload) {
    useCanvasConfig.setState((state) => {
        state.currentFlag = payload;
        state.currentModifier = null;
        state.primaryColor = null;
    });
}

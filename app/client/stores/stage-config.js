import { createStore } from "./store";

export const useStageConfig = createStore({
    primaryColor: "#af3eee",
    currentModifier: null,
    currentFlag: null,
});

export function setPrimaryColor(payload) {
    useStageConfig.setState((state) => {
        state.primaryColor = payload?.toLowerCase() ?? payload;
        state.currentFlag = null;
    });
}

export function setCurrentModifier(payload) {
    useStageConfig.setState((state) => {
        state.currentModifier = payload;
        state.currentFlag = null;
    });
}

export function setCurrentFlag(payload) {
    useStageConfig.setState((state) => {
        state.currentFlag = payload;
        state.currentModifier = null;
        state.primaryColor = null;
    });
}

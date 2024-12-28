import { createStore } from "./store";

export const useCanvasConfig = createStore({
    primaryColor: "#fbe64d",
    secondaryColor: null,
});

export function setPrimaryColor(payload) {
    useCanvasConfig.setState((state) => {
        state.primaryColor = payload?.toLowerCase() ?? payload;
    });
}

export function setSecondaryColor(payload) {
    useCanvasConfig.setState((state) => {
        state.secondaryColor = payload?.toLowerCase() ?? payload;
    });
}

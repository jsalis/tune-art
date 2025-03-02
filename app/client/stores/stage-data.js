import { STAGE_WIDTH, STAGE_HEIGHT } from "../config";

import { createStore } from "./store";
import { pushChange } from "./changes";

function createStageData(width, height) {
    const data = [];

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            data.push({
                color: [0, 0, 0, 0],
                mod: null,
            });
        }
    }

    return { width, height, data };
}

const defaultState = createStageData(STAGE_WIDTH, STAGE_HEIGHT);

export const useStageData = createStore(defaultState);

export function clearStageData() {
    useStageData.setState(
        (state) => {
            state.width = defaultState.width;
            state.height = defaultState.height;
            state.data = defaultState.data;
        },
        (patches, inversePatches) => {
            pushChange({ patches, inversePatches });
        },
    );
}

export function updateStageData(payload) {
    useStageData.setState(
        (state) => {
            state.width = payload.width;
            state.height = payload.height;
            state.data = payload.data;
        },
        (patches, inversePatches) => {
            pushChange({ patches, inversePatches });
        },
    );
}

import { useState, useRef, useMemo, useEffect } from "react";
import {
    Grid,
    Flex,
    Box,
    Label,
    Button,
    IconButton,
    Slider,
    ColorSwatch,
    Popconfirm,
    UndoIcon,
    RedoIcon,
    TrashIcon,
    useCallbackRef,
    useHotKey,
} from "londo-ui";
import { applyPatches } from "immer";
import styled, { css } from "styled-components";
import * as Tone from "tone";

import {
    useStageData,
    clearStageGrid,
    setStageGrid,
    setStartFlag,
    useStageConfig,
    setPrimaryColor,
    setCurrentModifier,
    setCurrentFlag,
    updatePointer,
    usePatches,
    useUndoDepth,
    useRedoDepth,
    undoChange,
    redoChange,
} from "../../../stores";
import { usePanner } from "../../../hooks";
import { hexToRgb, rgbToHex } from "../../../utils/color-util";
import { wrap } from "../../../utils/math-util";
import { getPointsBetween } from "../../../utils/vec2-util";

import { InfoPanel } from "./info-panel";
import { FlagIcon } from "./flag-icon";

const PIXEL_SIZE = 16;

const COLOR_TO_NOTE_MAP = {
    "#fbe64d": "C3",
    "#92922d": "C#3",
    "#b4fa50": "D3",
    "#378223": "D#3",
    "#67e645": "E3",
    "#53ad8e": "F3",
    "#2a685a": "F#3",
    "#57c6ea": "G3",
    "#000c99": "G#3",
    "#205bda": "A3",
    "#4b0f78": "A#3",
    "#6e64eb": "B3",
    "#af3eee": "C4",
    "#781976": "C#4",
    "#ea53da": "D4",
    "#6e140a": "D#4",
    "#ea3223": "E4",
    "#e69423": "F4",
    "#824316": "F#4",
    "#f6c2ab": "G4",
    "#8f7b5d": "G#4",
    "#929292": "A4",
    "#5b5b5b": "A#4",
    "#c0c0c0": "B4",
    "#ebebeb": "C5",
};

const MOD_TYPE = {
    ROTATE_LEFT: 1,
    ROTATE_RIGHT: 2,
    BOUNCE: 3,
};

const MOD_TYPE_TO_CHAR = {
    [MOD_TYPE.ROTATE_LEFT]: "L",
    [MOD_TYPE.ROTATE_RIGHT]: "R",
    [MOD_TYPE.BOUNCE]: "X",
};

const MOD_FUNC = {
    [MOD_TYPE.ROTATE_LEFT]: {
        "1,0": { x: 0, y: -1 },
        "0,1": { x: 1, y: 0 },
        "-1,0": { x: 0, y: 1 },
        "0,-1": { x: -1, y: 0 },
    },
    [MOD_TYPE.ROTATE_RIGHT]: {
        "1,0": { x: 0, y: 1 },
        "0,1": { x: -1, y: 0 },
        "-1,0": { x: 0, y: -1 },
        "0,-1": { x: 1, y: 0 },
    },
    [MOD_TYPE.BOUNCE]: {
        "1,0": { x: -1, y: 0 },
        "0,1": { x: 0, y: -1 },
        "-1,0": { x: 1, y: 0 },
        "0,-1": { x: 0, y: 1 },
    },
};

const DIR_TO_ROTATION_MAP = {
    "1,0": "rotate(0deg)",
    "0,1": "rotate(90deg)",
    "-1,0": "rotate(180deg)",
    "0,-1": "rotate(-90deg)",
};

const Canvas = styled.canvas`
    background-image: ${(p) => {
        const c1 = p.theme.colors.gray[1];
        const c2 = p.theme.colors.gray[3];
        return css`repeating-linear-gradient(45deg, ${c1}, ${c1} 11.3px, ${c2} 11.3px, ${c2} 22.6px)`;
    }};
    position: absolute;
    top: 50%;
    left: 50%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
`;

const CursorCanvas = styled.canvas`
    position: absolute;
    top: 50%;
    left: 50%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    pointer-events: none;
`;

const InstrumentOverlay = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    pointer-events: none;
`;

const GridOverlay = styled.div`
    width: ${(p) => p.width}px;
    height: ${(p) => p.height}px;
    background-size: ${PIXEL_SIZE}px ${PIXEL_SIZE}px;
    background-position: -1px -1px;
    background-image: ${(p) =>
        css`
            linear-gradient(to right, ${p.theme.colors.gray[4]} 2px, transparent 1px),
            linear-gradient(to bottom, ${p.theme.colors.gray[4]} 2px, transparent 1px)
        `};
    opacity: 0.6;
    position: absolute;
    top: 50%;
    left: 50%;
    pointer-events: none;
`;

export function EditorPage() {
    const contentRef = useRef(null);
    const canvasRef = useRef(null);
    const cursorCanvasRef = useRef(null);
    const shiftRef = useRef(false);

    const undoDepth = useUndoDepth();
    const redoDepth = useRedoDepth();

    useHotKey("ctrl+z", () => undoChange());
    useHotKey("shift+ctrl+z", () => redoChange());

    usePatches((patches, action) => {
        if (action !== "push") {
            useStageData.setState((s) => applyPatches(s, patches));
        }
    });

    const { primaryColor, currentModifier, currentFlag } = useStageConfig();
    const [tempo, setTempo] = useState(120);

    const [playheads, setPlayheads] = useState([
        { x: 1, y: 1, dx: 1, dy: 0 },
        { x: 1, y: 3, dx: 1, dy: 0 },
        { x: 1, y: 5, dx: 1, dy: 0 },
        { x: 1, y: 7, dx: 1, dy: 0 },
    ]);

    const [instruments, setInstruments] = useState([
        { playing: false },
        { playing: false },
        { playing: false },
        { playing: false },
    ]);

    const stage = useStageData();
    const synths = useMemo(() => createSynths(5), []);

    const width = stage.width * PIXEL_SIZE;
    const height = stage.height * PIXEL_SIZE;

    const transitionSec = useMemo(() => {
        return 1 / ((tempo * 2) / 60);
    }, [tempo]);

    const repeatCallback = useCallbackRef((time) => {
        const nextPlayheads = playheads.map((p, i) => {
            if (!instruments[i].playing) {
                return p;
            }

            const x = wrap(p.x + p.dx, 0, stage.width - 1);
            const y = wrap(p.y + p.dy, 0, stage.height - 1);
            const index = getPixelIndex(stage, x, y);
            const { mod } = stage.data[index];
            const dir = mod ? MOD_FUNC[mod][`${p.dx},${p.dy}`] : { x: p.dx, y: p.dy };

            return { ...p, x, y, dx: dir.x, dy: dir.y };
        });

        nextPlayheads.forEach((p, i) => {
            if (!instruments[i].playing) {
                return;
            }

            const synth = synths[i];
            const index = getPixelIndex(stage, p.x, p.y);
            const pixel = stage.data[index];

            if (pixel.color[3] > 0) {
                const hex = rgbToHex(...pixel.color);
                const note = COLOR_TO_NOTE_MAP[hex];

                if (note) {
                    synth.triggerAttackRelease(note, "8n", time);
                }
            }
        });

        setPlayheads(nextPlayheads);
    });

    useEffect(() => {
        Tone.start();
        Tone.getDestination().volume.rampTo(-10, 0.001);

        const transport = Tone.getTransport();
        transport.bpm.value = tempo;

        // Execute the callback function every eight note
        const eventId = transport.scheduleRepeat(repeatCallback, "8n");

        return () => transport.cancel(eventId);
    }, []);

    const panner = usePanner({
        initAtCenter: true,
        centerOffset: { x: width / 2, y: height / 2 },
        onUpdate({ x, y }, scale) {
            if (contentRef.current) {
                Object.assign(contentRef.current.style, {
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                });
            }
        },
    });

    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");
        const cursorCtx = cursorCanvasRef.current.getContext("2d");
        const stageClone = { ...stage, data: stage.data.slice(0) };

        let buttonDown = -1;
        let lastPosition = null;
        let hasGridChanges = false;

        const onKeyChange = (event) => {
            if (shiftRef.current !== event.shiftKey) {
                shiftRef.current = event.shiftKey;

                if (lastPosition) {
                    renderTexture();
                    renderCursor(lastPosition);
                }
            }
        };

        const onMouseDown = (event) => {
            event.preventDefault();
            buttonDown = event.button;

            const pos = getPixelPosition(event);
            updateAt([pos]);
            renderTexture();
        };

        const onMouseMove = (event) => {
            event.preventDefault();
            const pos = getPixelPosition(event);

            if (!lastPosition || !isPositionEqual(pos, lastPosition)) {
                if (lastPosition && buttonDown !== -1) {
                    const points = getPointsBetween(lastPosition, pos);
                    updateAt(points);
                }

                renderTexture();
                renderCursor(pos);
                updatePointer({ position: pos, mouseOver: true });
                lastPosition = pos;
            }

            if (buttonDown === 2) {
                clearCursor();
            }
        };

        const onMouseLeave = () => {
            renderTexture();
            clearCursor();
            updatePointer({ position: [0, 0], mouseOver: false });
            lastPosition = null;
        };

        const onMouseUp = (event) => {
            if (event.buttons === 0) {
                if (buttonDown === 0) {
                    const { currentFlag } = useStageConfig.getState();

                    if (currentFlag !== null) {
                        const pos = getPixelPosition(event);
                        updateFlag(pos, currentFlag);
                    }
                }
                if (hasGridChanges) {
                    setStageGrid(stageClone);
                }
                buttonDown = -1;
                lastPosition = null;
                hasGridChanges = false;
            }
        };

        const isPositionEqual = (a, b) => {
            return a[0] === b[0] && a[1] === b[1];
        };

        const getPixelPosition = (event) => {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.x) / (PIXEL_SIZE * panner.scale.current));
            const y = Math.floor((event.clientY - rect.y) / (PIXEL_SIZE * panner.scale.current));
            return [x, y];
        };

        const getNextStartPosition = (currentStart, x, y) => {
            if (currentStart.x === x && currentStart.y === y) {
                const dir = MOD_FUNC[MOD_TYPE.ROTATE_RIGHT][`${currentStart.dx},${currentStart.dy}`];
                return { ...currentStart, x, y, dx: dir.x, dy: dir.y };
            }
            return { ...currentStart, x, y };
        };

        const updateFlag = ([x, y], flag) => {
            if (x >= 0 && y >= 0 && x < stage.width && y < stage.height) {
                const start = getNextStartPosition(stage.startFlags[flag], x, y);

                for (let i = 0; i < stage.startFlags.length; i++) {
                    const f = stage.startFlags[i];

                    if (i !== flag && f.x === start.x && f.y === start.y) {
                        return;
                    }
                }

                setStartFlag(flag, start);
            }
        };

        const updateAt = (points) => {
            if (buttonDown === 0) {
                const { primaryColor, currentModifier } = useStageConfig.getState();

                if (primaryColor !== null || currentModifier !== null) {
                    const rgb = !shiftRef.current && primaryColor ? hexToRgb(primaryColor) : null;
                    const rgba = rgb ? [rgb.r, rgb.g, rgb.b, 255] : [0, 0, 0, 0];
                    const mod = !shiftRef.current ? currentModifier : null;
                    setAllPixelColors(canvasRef.current, stageClone, points, rgba, mod);
                    hasGridChanges = true;
                }
            }
        };

        const renderTexture = () => {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            const { data, width, height } = stageClone;

            for (let px = 0; px < width; px++) {
                for (let py = 0; py < height; py++) {
                    const i = getPixelIndex(stageClone, px, py);
                    const { color, mod } = data[i];
                    const [r, g, b, a] = color;
                    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;

                    const x = px * PIXEL_SIZE;
                    const y = py * PIXEL_SIZE;
                    ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);

                    if (mod) {
                        ctx.fillStyle = "rgba(255,255,255,0.6)";
                        ctx.font = "12px monospace";
                        ctx.fillText(MOD_TYPE_TO_CHAR[mod], x + 4, y + 12);
                    }
                }
            }
        };

        const renderCursor = ([px, py]) => {
            cursorCtx.clearRect(0, 0, cursorCanvasRef.current.width, cursorCanvasRef.current.height);

            if (
                px >= 0 &&
                py >= 0 &&
                px < canvasRef.current.width / PIXEL_SIZE &&
                py < canvasRef.current.height / PIXEL_SIZE
            ) {
                const { width, height } = stageClone;
                const { primaryColor, currentModifier } = useStageConfig.getState();

                if (shiftRef.current) {
                    return;
                }

                const x = (px % width) * PIXEL_SIZE;
                const y = (py % height) * PIXEL_SIZE;

                if (primaryColor) {
                    cursorCtx.fillStyle = primaryColor;
                    cursorCtx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
                }

                if (currentModifier) {
                    cursorCtx.fillStyle = "rgba(255,255,255,0.6)";
                    cursorCtx.font = "12px monospace";
                    cursorCtx.fillText(MOD_TYPE_TO_CHAR[currentModifier], x + 4, y + 12);
                }
            }
        };

        const clearCursor = () => {
            cursorCtx.clearRect(0, 0, cursorCanvasRef.current.width, cursorCanvasRef.current.height);
        };

        renderTexture();
        panner.ref.current.addEventListener("mousedown", onMouseDown);
        panner.ref.current.addEventListener("mousemove", onMouseMove);
        panner.ref.current.addEventListener("mouseleave", onMouseLeave);
        document.addEventListener("mouseenter", onMouseUp);
        window.addEventListener("mouseup", onMouseUp);
        document.addEventListener("keydown", onKeyChange);
        document.addEventListener("keyup", onKeyChange);
        return () => {
            panner.ref.current?.removeEventListener("mousedown", onMouseDown);
            panner.ref.current?.removeEventListener("mousemove", onMouseMove);
            panner.ref.current?.removeEventListener("mouseleave", onMouseLeave);
            document.removeEventListener("mouseenter", onMouseUp);
            window.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("keydown", onKeyChange);
            document.removeEventListener("keyup", onKeyChange);
        };
    }, [stage]);

    useEffect(() => {
        const transport = Tone.getTransport();
        const isPlaying = instruments.some((s) => s.playing);

        if (isPlaying && transport.state === "stopped") {
            transport.start();
        } else if (!isPlaying && transport.state === "started") {
            transport.stop();
        }
    }, [instruments]);

    const onInstrumentToggle = (index) => {
        setInstruments((prevInstruments) => {
            return prevInstruments.map((s, i) => ({
                ...s,
                playing: i === index ? !s.playing : s.playing,
            }));
        });
    };

    const onStopInstruments = () => {
        setInstruments((prevInstruments) => {
            return prevInstruments.map((s) => ({
                ...s,
                playing: false,
            }));
        });
    };

    const onStartInstruments = () => {
        setInstruments((prevInstruments) => {
            return prevInstruments.map((s) => ({
                ...s,
                playing: true,
            }));
        });
    };

    const onRestartInstruments = () => {
        setPlayheads((prevPlayheads) => {
            return prevPlayheads.map((p, i) => ({
                ...p,
                ...stage.startFlags[i],
            }));
        });
    };

    const onSwatchClick = (event, color) => {
        event.preventDefault();

        if (event.button === 0) {
            if (primaryColor === color) {
                setPrimaryColor(null);
            } else {
                setPrimaryColor(color);
                const note = COLOR_TO_NOTE_MAP[color];
                synths.at(-1).triggerAttackRelease(note, "8n");
            }
        }
    };

    const onModifierClick = (event, mod) => {
        event.preventDefault();

        if (mod === currentModifier) {
            setCurrentModifier(null);
        } else {
            setCurrentModifier(mod);
        }
    };

    const onFlagClick = (index) => {
        setCurrentFlag(index);
    };

    const onClearStage = () => {
        clearStageGrid();
    };

    const onContextMenu = (event) => {
        event.preventDefault();
    };

    return (
        <Grid columns="auto" rows="40px auto 200px" minWidth="512px" height="100vh">
            <InfoPanel />
            <Flex
                ref={panner.ref}
                position="relative"
                overflow="hidden"
                cursor="crosshair"
                onContextMenu={onContextMenu}
            >
                <Box ref={contentRef} position="absolute" userSelect="none">
                    <Canvas ref={canvasRef} width={width} height={height} />
                    <CursorCanvas ref={cursorCanvasRef} width={width} height={height} />
                    <GridOverlay width={width} height={height} />
                    <InstrumentOverlay width={width} height={height}>
                        {stage.startFlags.map((f, i) => (
                            <Box
                                key={i}
                                size={PIXEL_SIZE}
                                position="absolute"
                                style={{
                                    left: f.x * PIXEL_SIZE,
                                    top: f.y * PIXEL_SIZE,
                                    transform: DIR_TO_ROTATION_MAP[`${f.dx},${f.dy}`],
                                    filter: "drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.7))",
                                }}
                            >
                                <FlagIcon
                                    colorIndex={i}
                                    width={PIXEL_SIZE}
                                    height={PIXEL_SIZE}
                                    style={{ transform: "translate(4.5px, -7.5px)" }}
                                />
                            </Box>
                        ))}
                        {playheads.map((p, i) => (
                            <Box
                                key={i}
                                size={PIXEL_SIZE}
                                position="absolute"
                                style={{
                                    left: p.x * PIXEL_SIZE,
                                    top: p.y * PIXEL_SIZE,
                                    transition: `left ${transitionSec}s linear, top ${transitionSec}s linear`,
                                    filter: "drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.7))",
                                }}
                            >
                                <svg viewBox="0 0 32 32" width={PIXEL_SIZE} height={PIXEL_SIZE}>
                                    <polygon
                                        points="16 8, 24 16, 16 24, 8 16"
                                        fill={["yellow", "green", "blue", "red"][i]}
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </Box>
                        ))}
                    </InstrumentOverlay>
                </Box>
            </Flex>
            <Flex p={2} gap={2} bg="gray.1" borderTop="base" justify="center">
                <Flex gap={3} direction="column" align="center">
                    <Flex gap={2}>
                        {instruments.map((s, i) => (
                            <Flex key={i} gap={2} align="center">
                                <IconButton
                                    icon={
                                        <svg viewBox="0 0 32 32" width="24" height="24">
                                            <polygon
                                                points="16 8, 24 16, 16 24, 8 16"
                                                fill={["yellow", "green", "blue", "red"][i]}
                                                stroke="white"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    }
                                    variant={s.playing ? "primary" : "default"}
                                    onClick={() => onInstrumentToggle(i)}
                                />
                            </Flex>
                        ))}
                        <Flex mx={2} gap={2}>
                            <Button onClick={onStartInstruments}>Go</Button>
                            <Button onClick={onStopInstruments}>Stop</Button>
                            <Button onClick={onRestartInstruments}>Restart</Button>
                        </Flex>
                        {instruments.map((s, i) => (
                            <Flex key={i} gap={2} align="center">
                                <IconButton
                                    icon={<FlagIcon colorIndex={i} width="24" height="24" />}
                                    variant={i === currentFlag ? "primary" : "default"}
                                    onClick={() => onFlagClick(i)}
                                />
                            </Flex>
                        ))}
                        <Flex mx={2} gap={2}>
                            <IconButton
                                aria-label="Undo"
                                icon={<UndoIcon />}
                                disabled={undoDepth === 0}
                                onClick={() => undoChange()}
                            />
                            <IconButton
                                aria-label="Redo"
                                icon={<RedoIcon />}
                                disabled={redoDepth === 0}
                                onClick={() => redoChange()}
                            />
                        </Flex>
                        <Popconfirm
                            placement="top"
                            title="Clear the stage?"
                            okVariant="danger"
                            okText="Clear"
                            onConfirm={onClearStage}
                        >
                            <IconButton aria-label="Clear" icon={<TrashIcon />} />
                        </Popconfirm>
                    </Flex>
                    <Flex pt={36}>
                        {Object.entries(COLOR_TO_NOTE_MAP).map(([color, note]) => (
                            <Flex
                                key={note}
                                position="relative"
                                size={note.includes("#") ? 0 : 32}
                                mr={note.includes("#") ? 0 : 1}
                            >
                                <Box
                                    position="absolute"
                                    left={note.includes("#") ? "-16px" : ""}
                                    bottom={note.includes("#") ? "4px" : ""}
                                >
                                    <ColorSwatch
                                        color={color}
                                        primary={color === primaryColor}
                                        onClick={(e) => onSwatchClick(e, color)}
                                        onContextMenu={(e) => onSwatchClick(e, color)}
                                        size={32}
                                        cursor="pointer"
                                    >
                                        {note.includes("#") ? note.substring(0, 2) : note.substring(0, 1)}
                                    </ColorSwatch>
                                </Box>
                            </Flex>
                        ))}
                        <Box ml={1} mr={2} height={32} borderLeft="base" />
                        <Flex gap={1} position="relative">
                            <Flex
                                position="absolute"
                                top="-36px"
                                height="32px"
                                width="100%"
                                justify="center"
                                align="center"
                            >
                                <Label>Modifiers</Label>
                            </Flex>
                            {Object.entries(MOD_TYPE_TO_CHAR).map(([mod, char]) => (
                                <ColorSwatch
                                    key={mod}
                                    primary={mod === currentModifier}
                                    onClick={(e) => onModifierClick(e, mod)}
                                    color="#ffffff"
                                    size={32}
                                    cursor="pointer"
                                >
                                    {char}
                                </ColorSwatch>
                            ))}
                        </Flex>
                    </Flex>
                    <Slider
                        width={200}
                        min={60}
                        max={360}
                        step={5}
                        value={[tempo]}
                        onValueChange={([val]) => setTempo(val)}
                        onChange={([val]) => {
                            Tone.getTransport().bpm.value = val;
                        }}
                    />
                    <Label mt={-2} fontSize={1}>
                        {tempo} BPM
                    </Label>
                </Flex>
            </Flex>
        </Grid>
    );
}

function createSynths(count) {
    const synths = [];

    for (let i = 0; i < count; i++) {
        const synth = new Tone.Synth({ oscillator: { type: "square8" } }).toDestination();
        synths.push(synth);
    }

    return synths;
}

function getPixelIndex(image, px, py) {
    const { width } = image;
    return px + py * width;
}

function setPixelColor(image, x, y, rgba, mod) {
    const { data } = image;
    const i = getPixelIndex(image, x, y);
    data[i] = {
        ...data[i],
        color: [...rgba],
        mod: mod ?? null,
    };
}

function setAllPixelColors(canvas, image, points, rgba, mod) {
    const cw = canvas.width / PIXEL_SIZE;
    const ch = canvas.height / PIXEL_SIZE;
    const { width, height } = image;

    for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];

        if (x >= 0 && y >= 0 && x < cw && y < ch) {
            setPixelColor(image, x % width, y % height, rgba, mod);
        }
    }
}

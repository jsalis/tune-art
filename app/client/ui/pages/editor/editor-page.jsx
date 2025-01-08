import { useState, useRef, useMemo, useEffect } from "react";
import { Grid, Flex, Box, Label, Button, Slider, ColorSwatch, useCallbackRef } from "londo-ui";
import styled, { css, keyframes } from "styled-components";
import * as Tone from "tone";

import { useCanvasConfig, setPrimaryColor, setSecondaryColor, setCurrentModifier } from "../../../stores";
import { usePanner } from "../../../hooks";
import { hexToRgb, rgbToHex } from "../../../utils/color-util";
import { wrap } from "../../../utils/math-util";
import { getPointsBetween } from "../../../utils/vec2-util";

const CANVAS_WIDTH = 48;
const CANVAS_HEIGHT = 32;
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
    LEFT: 1,
    RIGHT: 2,
    BOUNCE: 3,
};

const MOD_TYPE_TO_CHAR = {
    [MOD_TYPE.LEFT]: "L",
    [MOD_TYPE.RIGHT]: "R",
    [MOD_TYPE.BOUNCE]: "X",
};

const MOD_FUNC = {
    [MOD_TYPE.LEFT]: {
        "1,0": { x: 0, y: -1 },
        "0,1": { x: 1, y: 0 },
        "-1,0": { x: 0, y: 1 },
        "0,-1": { x: -1, y: 0 },
    },
    [MOD_TYPE.RIGHT]: {
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

const pulse = keyframes`
    0% {
        transform: translate(50%, 50%) scale(0.8);
    }
    50% {
        transform: translate(50%, 50%) scale(1.2);
    }
    100% {
        transform: translate(50%, 50%) scale(0.8);
    }
`;

const Playhead = styled(Box)`
    background: red;
    border: 1px solid black;
    border-radius: 100%;
    animation: ${pulse} 1s infinite ease-in-out;
`;

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
    const canvas = useRef(null);
    const cursorCanvas = useRef(null);
    const shiftRef = useRef(false);

    const { primaryColor, secondaryColor, currentModifier } = useCanvasConfig();
    const [tempo, setTempo] = useState(120);
    const [isPlaying, setIsPlaying] = useState(false);

    const [playheads, setPlayheads] = useState([
        { x: 0, y: 0, dx: 1, dy: 0 },
        { x: 0, y: 31, dx: 0, dy: -1 },
        { x: 47, y: 31, dx: -1, dy: 0 },
        { x: 47, y: 0, dx: 0, dy: 1 },
    ]);

    const [table, setTable] = useState(() => createSequenceTable(CANVAS_WIDTH, CANVAS_HEIGHT));
    const synths = useMemo(() => createSynths(4), []);

    const width = table.width * PIXEL_SIZE;
    const height = table.height * PIXEL_SIZE;

    const transitionSec = useMemo(() => {
        return 1 / ((tempo * 2) / 60);
    }, [tempo]);

    const repeatCallback = useCallbackRef((time) => {
        const nextPlayheads = playheads.map((p) => {
            const index = getPixelIndex(table, p.x, p.y);
            const { mod } = table.data[index];
            const dir = mod ? MOD_FUNC[mod][`${p.dx},${p.dy}`] : { x: p.dx, y: p.dy };
            return {
                ...p,
                x: wrap(p.x + dir.x, 0, table.width - 1),
                y: wrap(p.y + dir.y, 0, table.height - 1),
                dx: dir.x,
                dy: dir.y,
            };
        });

        nextPlayheads.forEach((p, i) => {
            const synth = synths[i];
            const index = getPixelIndex(table, p.x, p.y);
            const pixel = table.data[index];

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
        const ctx = canvas.current.getContext("2d");
        const cursorCtx = cursorCanvas.current.getContext("2d");
        const textureClone = { ...table, data: table.data.slice(0) };

        let buttonDown = -1;
        let lastPosition = null;

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
                // updatePointer({ position: pos, mouseOver: true });
                lastPosition = pos;
            }

            if (buttonDown === 2) {
                clearCursor();
            }
        };

        const onMouseLeave = () => {
            renderTexture();
            clearCursor();
            // updatePointer({ position: [0, 0], mouseOver: false });
            lastPosition = null;
        };

        const onMouseUp = (event) => {
            if (event.buttons === 0) {
                if (buttonDown !== -1) {
                    setTable(textureClone);
                }
                buttonDown = -1;
                lastPosition = null;
            }
        };

        const isPositionEqual = (a, b) => {
            return a[0] === b[0] && a[1] === b[1];
        };

        const getPixelPosition = (event) => {
            const rect = canvas.current.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.x) / (PIXEL_SIZE * panner.scale.current));
            const y = Math.floor((event.clientY - rect.y) / (PIXEL_SIZE * panner.scale.current));
            return [x, y];
        };

        const updateAt = (points) => {
            if (buttonDown === 0) {
                const { primaryColor, secondaryColor, currentModifier } = useCanvasConfig.getState();
                const activeColor = shiftRef.current ? secondaryColor : primaryColor;
                const rgb = activeColor ? hexToRgb(activeColor) : null;
                const rgba = activeColor ? [rgb.r, rgb.g, rgb.b, 255] : [0, 0, 0, 0];
                const mod = activeColor ? currentModifier : null;
                setAllPixelColors(canvas.current, textureClone, points, rgba, mod);
            }
        };

        const renderTexture = () => {
            ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
            const { data, width, height } = textureClone;

            for (let px = 0; px < width; px++) {
                for (let py = 0; py < height; py++) {
                    const i = getPixelIndex(textureClone, px, py);
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
            cursorCtx.clearRect(0, 0, cursorCanvas.current.width, cursorCanvas.current.height);

            if (
                px >= 0 &&
                py >= 0 &&
                px < canvas.current.width / PIXEL_SIZE &&
                py < canvas.current.height / PIXEL_SIZE
            ) {
                const { width, height } = textureClone;
                const { primaryColor, secondaryColor, currentModifier } = useCanvasConfig.getState();
                const activeColor = shiftRef.current ? secondaryColor : primaryColor;

                if (!activeColor) {
                    return;
                }

                cursorCtx.fillStyle = activeColor;

                const x = (px % width) * PIXEL_SIZE;
                const y = (py % height) * PIXEL_SIZE;
                cursorCtx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);

                if (currentModifier) {
                    cursorCtx.fillStyle = "rgba(255,255,255,0.6)";
                    cursorCtx.font = "12px monospace";
                    cursorCtx.fillText(MOD_TYPE_TO_CHAR[currentModifier], x + 4, y + 12);
                }
            }
        };

        const clearCursor = () => {
            cursorCtx.clearRect(0, 0, cursorCanvas.current.width, cursorCanvas.current.height);
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
    }, [table.data]);

    const togglePlay = () => {
        const transport = Tone.getTransport();

        if (isPlaying) {
            transport.stop();
            setIsPlaying(false);
        } else {
            transport.start();
            setIsPlaying(true);
        }
    };

    const onSwatchClick = (event, color) => {
        event.preventDefault();

        if (event.button === 0) {
            setPrimaryColor(color);
        } else if (event.button === 2) {
            setSecondaryColor(secondaryColor === color ? null : color);
        }

        const note = COLOR_TO_NOTE_MAP[color];
        synths[0].triggerAttackRelease(note, "8n");
    };

    const onModifierClick = (event, mod) => {
        event.preventDefault();

        if (mod === currentModifier) {
            setCurrentModifier(null);
        } else {
            setCurrentModifier(mod);
        }
    };

    const onContextMenu = (event) => {
        event.preventDefault();
    };

    return (
        <Grid columns="auto" rows="40px auto 200px" minWidth="512px" height="100vh">
            <Flex bg="gray.1" borderBottom="base" justify="center" align="center"></Flex>
            <Flex
                ref={panner.ref}
                position="relative"
                overflow="hidden"
                cursor="crosshair"
                onContextMenu={onContextMenu}
            >
                <Box ref={contentRef} position="absolute" userSelect="none">
                    <Canvas ref={canvas} width={width} height={height} />
                    <CursorCanvas ref={cursorCanvas} width={width} height={height} />
                    <GridOverlay width={width} height={height} />
                    <InstrumentOverlay width={width} height={height}>
                        {playheads.map((p, i) => (
                            <Playhead
                                key={i}
                                size={PIXEL_SIZE / 2}
                                position="absolute"
                                style={{
                                    left: p.x * PIXEL_SIZE,
                                    top: p.y * PIXEL_SIZE,
                                    transition: `left ${transitionSec}s linear, top ${transitionSec}s linear`,
                                }}
                            />
                        ))}
                    </InstrumentOverlay>
                </Box>
            </Flex>
            <Flex p={2} gap={2} bg="gray.1" borderTop="base" justify="center">
                <Flex gap={3} direction="column" align="center">
                    <Button onClick={togglePlay}>{isPlaying ? "Stop" : "Play"}</Button>
                    <Flex pt={36}>
                        {Object.entries(COLOR_TO_NOTE_MAP).map(([color, note], i) => (
                            <Flex
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
                                        key={color}
                                        color={color}
                                        primary={color === primaryColor}
                                        secondary={color === secondaryColor}
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

function createSequenceTable(width, height) {
    const data = [];
    const colors = Object.keys(COLOR_TO_NOTE_MAP);

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const hex = colors[Math.floor(Math.random() * colors.length)];
            const rgb = hexToRgb(hex);
            data.push({
                color: [rgb.r, rgb.g, rgb.b, Math.random() < 0 ? 255 : 0],
                mod: null,
            });
        }
    }

    return { width, height, data };
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

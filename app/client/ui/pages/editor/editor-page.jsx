import { useState, useMemo, useEffect } from "react";
import { Grid, Flex, Box, Label, Button, Slider, useCallbackRef } from "londo-ui";
import * as Tone from "tone";

const notes = ["F4", "Eb4", "C4", "Bb3", "Ab3", "F3"];
const beatsPerMeasure = 8;

export function EditorPage() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [force, setForce] = useState(0);
    const [beat, setBeat] = useState(-1);
    const [tempo, setTempo] = useState(120);

    const table = useMemo(() => createSequenceTable(notes), []);
    const synths = useMemo(() => createSynths(notes.length), []);

    const repeatCallback = useCallbackRef((time) => {
        const nextBeat = (beat + 1) % beatsPerMeasure;

        table.forEach((row, index) => {
            const synth = synths[index];
            const note = row[nextBeat];

            if (note.enabled) {
                synth.triggerAttackRelease(note.note, "8n", time);
            }
        });

        setBeat(nextBeat);
    });

    useEffect(() => {
        Tone.start();
        Tone.getDestination().volume.rampTo(-10, 0.001);

        const transport = Tone.getTransport();
        transport.bpm.value = 120;

        // Execute the callback function every eight note
        const eventId = transport.scheduleRepeat(repeatCallback, "8n");

        return () => transport.cancel(eventId);
    }, []);

    const toggleNote = (index) => {
        const i = Math.floor(index / beatsPerMeasure);
        const j = index % beatsPerMeasure;
        const note = table[i][j];

        note.enabled = !note.enabled;
        setForce((f) => f + 1);
    };

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

    const getCellBackground = (index) => {
        if (index % beatsPerMeasure === beat) {
            return "gray.1";
        }
        return "";
    };

    const getCellTransform = (index, enabled) => {
        if (enabled && index % beatsPerMeasure === beat) {
            return "scale(1.2)";
        }
        return "";
    };

    return (
        <Grid columns="auto" rows="40px auto 160px" minWidth="512px" height="100vh">
            <Flex bg="gray.1" borderBottom="base" justify="space-between" align="center" />
            <Flex direction="column" overflow="hidden" align="center" justify="center">
                <Grid p={2} flex="none" columns={beatsPerMeasure}>
                    {table.flat().map((note, i) => (
                        <Flex key={i} p={2} bg={getCellBackground(i)}>
                            <Box
                                size={30}
                                borderRadius="base"
                                bg={note.enabled ? "primary.base" : "gray.3"}
                                onClick={() => toggleNote(i)}
                                style={{
                                    transform: getCellTransform(i, note.enabled),
                                    transition: "transform 0.1s",
                                    cursor: "pointer",
                                }}
                            />
                        </Flex>
                    ))}
                </Grid>
                <Label mt={2} fontSize={3}>
                    {beat + 1}
                </Label>
            </Flex>
            <Flex p={2} gap={2} bg="gray.1" borderTop="base" justify="center">
                <Flex gap={3} direction="column" align="center">
                    <Button onClick={togglePlay}>{isPlaying ? "Stop" : "Play"}</Button>
                    <Slider
                        width={200}
                        min={60}
                        max={360}
                        value={[tempo]}
                        onValueChange={([val]) => setTempo(val)}
                        onChange={([val]) => {
                            Tone.getTransport().bpm.value = val;
                        }}
                    />
                    <Label fontSize={1}>{tempo} BPM</Label>
                </Flex>
            </Flex>
        </Grid>
    );
}

const createSynths = (count) => {
    const synths = [];

    for (let i = 0; i < count; i++) {
        const synth = new Tone.Synth({ oscillator: { type: "square8" } }).toDestination();
        synths.push(synth);
    }

    return synths;
};

const createSequenceTable = (notes) => {
    const rows = [];

    for (const note of notes) {
        const row = [];
        for (let i = 0; i < beatsPerMeasure; i++) {
            row.push({
                note: note,
                enabled: Math.random() < 0.15, // false
            });
        }
        rows.push(row);
    }

    return rows;
};

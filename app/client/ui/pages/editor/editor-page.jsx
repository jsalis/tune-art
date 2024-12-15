import { useEffect } from "react";
import { Grid, Flex, Label } from "londo-ui";
import * as Tone from "tone";

window.Tone = Tone;

export function EditorPage() {
    useEffect(() => {
        const synth = new Tone.FMSynth().toDestination();
        // const synth = new Tone.PolySynth(Tone.Synth).toDestination();

        // const filter = new Tone.Filter(400, "lowpass").toDestination();
        // const feedbackDelay = new Tone.FeedbackDelay(0.125, 0.5).toDestination();

        // synth.connect(filter);
        // synth.connect(feedbackDelay);

        // const keys = new Tone.Players({
        //     urls: {
        //         0: "A1.mp3",
        //         1: "Cs2.mp3",
        //         2: "E2.mp3",
        //         3: "Fs2.mp3",
        //     },
        //     fadeOut: "64n",
        //     baseUrl: "https://tonejs.github.io/audio/casio/",
        // }).toDestination();

        const now = Tone.now();

        Tone.getTransport().bpm.value = 240;

        synth.triggerAttackRelease("C#4", "8n", "+0:0:0");
        synth.triggerAttackRelease("C#4", "8n", "+0:1:0");
        synth.triggerAttackRelease("C#4", "8n", "+0:2:0");
        synth.triggerAttackRelease("B3", "8n.", "+0:3:0");
        synth.triggerAttackRelease("C#4", "8n", "+0:4:1");
        synth.triggerAttackRelease("E4", "8n.", "+0:5:1");

        synth.triggerAttackRelease("C#4", "8n", "+0:8:0");
        synth.triggerAttackRelease("C#4", "8n", "+0:9:0");
        synth.triggerAttackRelease("C#4", "8n", "+0:10:0");
        synth.triggerAttackRelease("B3", "8n.", "+0:11:0");
        synth.triggerAttackRelease("F#4", "8n", "+0:12:1");
        synth.triggerAttackRelease("E4", "8n.", "+0:13:1");

        return () => synth.disconnect();
    }, []);

    return (
        <Grid columns="auto" rows="40px auto 160px" minWidth="1024px" height="100vh">
            <Flex bg="gray.1" borderBottom="base" justify="space-between" align="center">
                <Label px={2}>Tune Art</Label>
            </Flex>
            <Flex overflow="hidden"></Flex>
            <Flex p={2} gap={2} bg="gray.1" borderTop="base"></Flex>
        </Grid>
    );
}

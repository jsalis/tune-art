import { Flex, Box, Heading, Button, ErrorIcon } from "londo-ui";

export function FatalErrorPage() {
    return (
        <Flex
            width="100vw"
            height="100vh"
            direction="column"
            align="center"
            justify="center"
            lineHeight="base"
        >
            <ErrorIcon size={100} color="danger.base" />
            <Heading level={1} my={2} fontFamily="brand">
                Fatal Error
            </Heading>
            <Box my={2} fontSize={1} textAlign="center" color="gray.base">
                Our disappointment is immeasureable and our day is ruined.
                <br />
                The developer of this software has now been fired.
            </Box>
            <Button mt={3} onClick={() => window.location.reload()}>
                Reboot System
            </Button>
        </Flex>
    );
}

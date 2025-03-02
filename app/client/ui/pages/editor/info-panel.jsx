import { Flex, Box, Label } from "londo-ui";

import { usePointer } from "../../../stores";

export function InfoPanel() {
    const pointer = usePointer((s) => (s.mouseOver ? s.position.join(" ") : "--"));

    return (
        <Flex bg="gray.1" borderBottom="base" justify="center" align="center">
            <Box whiteSpace="nowrap">
                <Label px={2} minWidth={140}>
                    Pointer: {pointer}
                </Label>
            </Box>
        </Flex>
    );
}

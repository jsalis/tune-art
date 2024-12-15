import { useNavigate } from "react-router-dom";
import { Flex, Box, Heading, Button } from "londo-ui";

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Flex
            width="100vw"
            height="100vh"
            direction="column"
            justify="center"
            align="center"
            lineHeight="base"
        >
            <Heading level={1} my={2} fontFamily="brand">
                404
            </Heading>
            <Box my={2} fontSize={1} textAlign="center" color="gray.base">
                Page Not Found
            </Box>
            <Button mt={3} onClick={() => navigate("/")}>
                Go Home
            </Button>
        </Flex>
    );
}

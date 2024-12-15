import { Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Flex, Spinner, ThemeProvider, ResetStyle, ToastProvider, useLocalStorage } from "londo-ui";

import { EditorPage } from "./pages/editor/editor-page";
import { NotFoundPage } from "./pages/not-found/not-found-page";
import { FatalErrorPage } from "./pages/fatal-error/fatal-error-page";

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: "/",
                element: <EditorPage />,
                errorElement: <FatalErrorPage />,
            },
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);

const fallback = (
    <Flex height="100vh" justify="center" align="center">
        <Spinner m={4} />
    </Flex>
);

function RootLayout() {
    const [theme] = useLocalStorage("theme", "dark");
    return (
        <ThemeProvider theme={theme}>
            <ResetStyle />
            <ToastProvider>
                <Suspense fallback={fallback}>
                    <Outlet />
                </Suspense>
            </ToastProvider>
        </ThemeProvider>
    );
}

export function App() {
    return <RouterProvider router={router} fallbackElement={fallback} />;
}

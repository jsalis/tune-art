export function createRouter(baseRoute) {
    const entries = [];

    return {
        post(pattern, fn) {
            entries.push({ method: "POST", pattern, fn });
        },
        patch(pattern, fn) {
            entries.push({ method: "PATCH", pattern, fn });
        },
        delete(pattern, fn) {
            entries.push({ method: "DELETE", pattern, fn });
        },
        get(pattern, fn) {
            entries.push({ method: "GET", pattern, fn });
        },
        execute(arg) {
            const { event } = arg;
            const method = event.httpMethod;
            const match = entries.find((entry) => {
                const path = baseRoute + (entry.pattern === "/" ? "" : entry.pattern);
                return entry.method === method && event.path.endsWith(path);
            });

            return match?.fn(arg) ?? { statusCode: 404 };
        },
    };
}

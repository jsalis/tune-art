export function createRequestHandler(router, options = {}) {
    return async (event, context) => {
        try {
            const auth = context.clientContext.user;

            if (!options.public && !auth) {
                return {
                    statusCode: 401,
                };
            }

            return await router.execute({ event, auth });
        } catch (error) {
            return {
                statusCode: 500,
                body: error.message,
            };
        }
    };
}

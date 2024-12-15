import { prisma } from "../db";
import { createRouter } from "../router";
import { createRequestHandler } from "../request";

const router = createRouter("/user");

router.patch("/", async ({ event, auth }) => {
    const params = JSON.parse(event.body);
    const match = await prisma.user.count({
        take: 1,
        where: {
            id: {
                not: auth.sub,
            },
            username: params.username,
        },
    });

    if (match) {
        return {
            statusCode: 400,
            body: "Username already exists.",
        };
    }

    const user = await prisma.user.upsert({
        update: {
            username: params.username,
        },
        create: {
            id: auth.sub,
            email: auth.email,
            username: params.username,
        },
        where: {
            id: auth.sub,
        },
    });

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    };
});

router.get("/", async ({ auth }) => {
    const user = await prisma.user.findUnique({
        where: {
            id: auth.sub,
        },
    });

    if (!user) {
        // TODO create user on sign up
        const username = auth.email.split("@")[0].toLowerCase();
        const newUser = await prisma.user.create({
            data: {
                id: auth.sub,
                email: auth.email,
                username: username,
            },
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser),
        };
    }

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    };
});

export const handler = createRequestHandler(router);

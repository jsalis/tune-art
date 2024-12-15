import { PrismaClient } from "@prisma/client";

/**
 * https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
 *
 * @type {PrismaClient}
 */
export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.CONTEXT === "dev") {
    globalThis.prisma = prisma;
}

import { vi } from "vitest";
import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Generates mocked fastify request and reply objects for testing.
 * 
 */
export const createMockFastifyObjects = <TBody>(
  { request }: {
    request: Partial<FastifyRequest<{ Body: TBody }>>;
  }
): {
  request: FastifyRequest<{ Body: TBody }>
  reply: FastifyReply
} => {

  const mockReplyCode = vi.fn().mockReturnThis() // .code() should return the reply for chaining
  const mockReplySend = vi.fn().mockReturnThis() // .send() might also return reply

  const mockReply: Partial<FastifyReply> = {
    code: mockReplyCode,
    send: mockReplySend,
  }

  return {
    request: request as FastifyRequest<{ Body: TBody }>,
    reply: mockReply as FastifyReply,
  }
}


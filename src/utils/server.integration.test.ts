import { describe, it, expect, vi } from "vitest";
import supertest from "supertest";
import { db } from "../db/__mock__";
import { testApp } from "../../test/vitest.integration.test.setup";

describe('Server Health Check', () => {
  it('should have proper CORS headers', async () => {
    const response = await supertest(testApp.server)
      .get("/healthcheck")
      .expect(200)

    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers['access-control-allow-origin']).toBeDefined()
  })


  it("should return healthy status with all checks passing", async () => {
    const response = await supertest(testApp.server)
      .get("/healthcheck")
      .expect(200)

    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: "test"
    })
  })

  it('should return error status when database is down', async () => {

    vi.spyOn(db, 'execute').mockRejectedValueOnce(new Error('DB error'))


    const response = await supertest(testApp.server)
      .get("/healthcheck")
      .expect(503)

    expect(response.body).toEqual({
      status: 'error',
      message: 'Database connection failed',
      timestamp: expect.any(String),
    })
  })
})
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const createApplicationBodySchema = z.object({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string',
  }).min(1),
})
export type CreateApplicationBody = z.infer<typeof createApplicationBodySchema>


export const createApplicationJsonSchema = {
  body: zodToJsonSchema(createApplicationBodySchema, 'createApplicationBodySchema')
}
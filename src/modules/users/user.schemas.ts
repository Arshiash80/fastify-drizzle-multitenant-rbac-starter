import { z } from "zod"
import zodToJsonSchema from "zod-to-json-schema"

// MARK: Create User Schema ------------------------------------------------------------>
export const createUserBodySchema = z.object({
  applicationId: z
    .string()
    .uuid(), // <- enforce that the applicationId is a valid UUID
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  initialUser: z.boolean().default(false).optional(),
})

export type CreateUserBody = z.infer<typeof createUserBodySchema>

export const createUserJsonSchema = {
  body: zodToJsonSchema(createUserBodySchema, 'createUserBodySchema'),
}
// MARK: <------------------------------------------------------------------------------


// MARK: Login User Schema ------------------------------------------------------------>
export const loginUserBodySchema = z.object({
  applicationId: z.string().uuid(),
  email: z.string().email(),
  password: z.string(),
})
export type LoginUserBody = z.infer<typeof loginUserBodySchema>

export const loginUserJsonSchema = {
  body: zodToJsonSchema(loginUserBodySchema, 'loginUserBodySchema'),
}
// MARK: <------------------------------------------------------------------------------


// MARK: Assign Role to User Schema ------------------------------------------------------------>
export const assignRoleToUserBodySchema = z.object({
  roleId: z.string().uuid(),
  userId: z.string().uuid(),
})

export type AssignRoleToUserBody = z.infer<typeof assignRoleToUserBodySchema>

export const assignRoleToUserJsonSchema = {
  body: zodToJsonSchema(assignRoleToUserBodySchema, 'assignRoleToUserBodySchema'),
}
// MARK: <------------------------------------------------------------------------------
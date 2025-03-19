import z from "zod";

export const SignupSchema = z.object({
  name: z.string(),
  username: z.string(),
  password: z.string(),
  type: z.enum(["user", "admin"]),
  avatarId: z.string().optional(),
});

export const SigninSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const UpdateMetadataSchema = z.object({
  avatarId: z.string().optional(),
  name: z.string().optional(),
});

export const CreateSpaceSchema = z.object({
  name: z.string(),
  dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
  mapId: z.string().optional(),
  thumbnail: z.string().optional(),
});

export const DeleteElementSchema = z.object({
  id: z.string(),
});

export const AddElementSchema = z.object({
  spaceId: z.string(),
  elementId: z.string(),
  x: z.number(),
  y: z.number(),
});

export const CreateElementSchema = z.object({
  imageUrl: z.string(),
  width: z.number(),
  height: z.number(),
  static: z.boolean(),
});

export const UpdateElementSchema = z.object({
  imageUrl: z.string(),
});

export const CreateAvatarSchema = z.object({
  name: z.string(),
  imageUrl: z.string(),
});

export const CreateMapSchema = z.object({
  thumbnail: z.string(),
  dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
  name: z.string(),
  defaultElements: z.array(
    z.object({
      elementId: z.string(),
      x: z.number(),
      y: z.number(),
      static: z.boolean(),
    })
  ),
});

// decllare custom properties in midleware to accss in routes
declare global {
  namespace Express {
    interface Request {
      role: string;
      userId: string;
    }
  }
}

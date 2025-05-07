import { Router } from "express";
import { userRouter } from "./user";
import { spaceRouter } from "./space";
import { adminRouter } from "./admin";
import { SigninSchema, SignupSchema } from "../../types";
import { hash, compare } from "../../scrypt";
import client from "@metaverse/db/client";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";
import authRoutes from "./auth";


export const router = Router();

router.post("/signup", async (req, res) => {
  console.log("inside signup");
  // check the user
  const parsedData = SignupSchema.safeParse(req.body);
  if (!parsedData.success) {
    console.log("parsed data incorrect");
    res.status(400).json({ message: "Validation failed" });
    return;
  }
  console.log(parsedData);
  const hashedPassword = await hash(parsedData.data.password);
  try {
    const user = await client.user.create({
      data: {
        name: parsedData.data.name,
        username: parsedData.data.username,
        password: hashedPassword,
        role: parsedData.data.type === "admin" ? "Admin" : "User",
        avatarId: parsedData.data.avatarId,
      },
    });
    const token = jwt.sign(
      {
        name: user.name,
        userId: user.id,
        role: user.role,
      },
      JWT_PASSWORD
    );

    res.json({
      userId: user.id,
      user,
      token
    });
    console.log("inside signup");
  } catch (e) {
    console.log("erroer thrown");
    console.log(e);
    res.status(400).json({ message: "User already exists" });
  }
});

router.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(403).json({ message: "Validation failed" });
    return;
  }

  try {
    const user = await client.user.findUnique({
      where: {
        username: parsedData.data.username,
      },
    });

    if (!user) {
      res.status(403).json({ message: "User not found" });
      return;
    }
    const isValid = await compare(parsedData.data.password, user.password);

    if (!isValid) {
      res.status(403).json({ message: "Invalid password" });
      return;
    }

    const token = jwt.sign(
      {
        name: user.name,
        userId: user.id,
        role: user.role,
      },
      JWT_PASSWORD
    );

    res.json({
      token,
    });
  } catch (e) {
    res.status(400).json({ message: "Internal server error" });
  }
});

router.get("/elements", async (req, res) => {
  const elements = await client.element.findMany();

  res.json({
    elements: elements.map((e) => ({
      id: e.id,
      imageUrl: e.imageUrl,
      width: e.width,
      height: e.height,
      static: e.static,
    })),
  });
});

router.get("/avatars", async (req, res) => {
  const avatars = await client.avatar.findMany();
  res.json({
    avatars: avatars.map((x) => ({
      id: x.id,
      imageUrl: x.imageUrl,
      name: x.name,
    })),
  });
});

router.get("/avatar/:avatarId", async (req, res)=>{
  const avatarId = req.params.avatarId;
  const avatar = await client.avatar.findUnique({
    where:{
      id: avatarId
    }
  });
  res.json({
    avatar
  });
})

router.get("/maps", async (req, res) => {
  const maps = await client.map.findMany();
  res.json({ maps });
});

router.use("/auth", authRoutes);

router.use("/user", userRouter);
router.use("/space", spaceRouter);
router.use("/admin", adminRouter);

// routes/auth.ts
import { Router } from "express";
import client from "@metaverse/db/client";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";


const router = Router();

router.post("/google", async (req, res) => {
  const { email, name, googleId } = req.body;

  try {
    // Check if user exists
    let user = await client.user.findUnique({
      where: { username: email },
    });
    console.log(googleId)

    if (!user) {
      // If user doesn't exist, create them
      user = await client.user.create({
        data: {
          username: email,
          name,
          password: "", // No password needed for Google sign-in
          avatarId: "cm8eqimgr00xjl3j2m8p2i7k1",
          role: "User",
        },
      });
    }

    // Generate a token
    const token = jwt.sign({ userId: user.id }, JWT_PASSWORD, {
      expiresIn: "1d",
    });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Google sign-in failed" });
  }
});

export default router;

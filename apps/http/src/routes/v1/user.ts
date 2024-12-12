import { Router } from "express";
import { UpdateMetadataSchema } from "../../types";
import client from "@metaverse/db/client";
import { userMiddleware } from "../../middleware/user";

export const userRouter = Router();

userRouter.post("/metadata", userMiddleware, async (req, res) => {
    const parsedData = UpdateMetadataSchema.safeParse(req.body)       
    if (!parsedData.success) {
        console.log("parsed data incorrect")
        res.status(400).json({message: "Validation failed"})
        return
    }
    try {
        const user = await client.user.update({
            where: {
                id: req.userId
            },
            data: {
                avatarId: parsedData.data.avatarId,
                name: parsedData.data.name
            },
            select:{
                username:true,
                name:true,
                avatarId:true,
                id:true,
                role:true
            }
        })
        res.json({message: "Metadata updated", user})
    } catch(e) {
        console.log("error")
        res.status(400).json({message: "Internal server error"})
    }
})
userRouter.get("/metadata", userMiddleware, async (req, res) => {
   
    const user = await client.user.findUnique({
        where: {
            id: req.userId
        }
    })
    console.log("user",user);
    
    
    if (!user) {
        res.status(404).json({message: "User not found"})
        return
    }


    res.json({
        user
    })
})
userRouter.post("/:UserId", userMiddleware, async (req, res) => {
   
    const user = await client.user.findUnique({
        where: {
            id: req.params.UserId
        }
    })
    console.log("user",user);
    
    
    if (!user) {
        res.status(404).json({message: "User not found"})
        return
    }


    res.json({
        user
    })
})

userRouter.get("/metadata/bulk", userMiddleware, async (req, res) => {
    const userIdString = (req.query.ids ?? "[]") as string;
    const userIds = (userIdString).slice(1, userIdString?.length - 1).split(",");
    console.log(userIds)
    const metadata = await client.user.findMany({
        where: {
            id: {
                in: userIds
            }
        }, select: {
            avatar: true,
            id: true
        }
    })

    res.json({
        avatars: metadata.map(m => ({
            userId: m.id,
            avatarId: m.avatar?.imageUrl
        }))
    })
})
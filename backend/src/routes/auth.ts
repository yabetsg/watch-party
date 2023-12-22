import express from "express";
import { Request, Response, NextFunction } from "express";
import Party from "../models/Party";
import { authorize } from "../middleware/authorize";
import { CustomRequest } from "../types";
const router = express.Router();

router.post("/", authorize, async (req:CustomRequest, res) => {
  const user = req.user;
  res.status(200).json(user);
});

export default router;

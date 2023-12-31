import { Request, Response, NextFunction } from "express";
import Party from "../models/Party";
import { CustomRequest } from "../types";
import User from "../models/User";

export const create_party = async (req: Request, res: Response) => {
  const partyID = req.params.id;
  if (!partyID) {
    return res.status(400).json({ error: "Party ID is required" });
  }
  try {
    const newParty = new Party({
      partyID,
      videoID: null,
      participants: 1,
    });
    await newParty.save();
    res.status(200).json({ message: "Party Created", data: newParty });
  } catch (err) {
    console.error("Error creating party:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// return current party details saved in cookies

export const get_party_info = async (req: CustomRequest, res: Response) => {
  const partyID = req.params.id;
  const savedParty = req.cookies.currentParty
    ? JSON.parse(req.cookies.currentParty)
    : null;
  if (!savedParty) {
    const partyInfo = await Party.findOne({ partyID }).exec();
    //TODO: handle party not existing
    return res.json({ data: partyInfo });
  }

  res.json({
    data: savedParty,
  });
};

export const get_participants = async (req: CustomRequest, res: Response) => {
  const partyID = req.params.id;

  const users = await User.find(
    {
      partyID: partyID,
    },
    "username"
  );

  res.json(users);
};

export const update_party = async (req: CustomRequest, res: Response) => {
  const partyID = req.params.id;
  const user = req.user as { user: { _id: string } };
  const youtubeID = req.body.youtubeID ? req.body.youtubeID : null;
  const joining = req.body.join;

  const leaving = req.body.leave;
  let updatedParty;
  let updatedUser;

  try {
    if (youtubeID) {
      updatedParty = await Party.findOneAndUpdate(
        {
          partyID: partyID,
        },
        {
          $set: { videoID: youtubeID },
        },
        { new: true }
      );
    } else if (joining) {
      // check if user has already joined

      const userExists = await User.findOne({
        _id: user.user._id,
        partyID,
      }).exec();
      if (userExists) {
        const currentParty = req.cookies.currentParty
          ? JSON.parse(req.cookies.currentParty)
          : null;

        return res.json({
          data: currentParty,
        });
      }

      updatedParty = await Party.findOneAndUpdate(
        {
          partyID: partyID,
        },
        {
          $inc: { participants: 1 },
        },
        { new: true }
      );

      updatedUser = await User.findByIdAndUpdate(
        user.user._id,
        {
          $set: { partyID: partyID },
        },
        { new: true }
      );
    } else if (leaving) {
      updatedParty = await Party.findOneAndUpdate(
        {
          partyID: partyID,
        },
        {
          $inc: { participants: -1 },
        },
        { new: true }
      );

      updatedUser = await User.findByIdAndUpdate(
        user.user._id,
        {
          $set: { partyID: null },
        },
        { new: true }
      );
    }

    res.cookie("currentParty", JSON.stringify(updatedParty));
    req.partyInfo = updatedParty ? updatedParty : undefined;

    return res.json({
      updatedParty,
      updatedUser,
    });
  } catch (err) {
    console.error("Error updating party:", err);
    res.status(500).json({
      message: "Error updating party:" + err,
      error: "Internal Server Error",
    });
  }
};

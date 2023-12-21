import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { join } from "node:path";
import { Server } from "socket.io";
import { createServer } from "node:http";
import partyRouter from "./routes/party";
import userRouter from "./routes/users";
import { authorize } from "./middleware/authorize";

dotenv.config();
const app = express();
app.use(express.static("src"));
app.use(express.json());
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://10.222.245.188:5173"],
    methods: ["GET", "POST"],
  },

  connectionStateRecovery: {},
});
const MONGODB_URL = String(process.env.MONGO_URL);

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(MONGODB_URL);
  // await createUser();
}

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});
app.use("/users", userRouter);
app.use("/party", partyRouter);
app.post("/", authorize);

let hostSocketID: string | null = null;
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("reconnect", () => {
    console.log("reconnecting");
  });
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
    console.log("message: " + msg);
  });
  socket.on("disconnect", (msg) => {
    console.log("disconnected");
  });
  socket.on("join", (roomID) => {
    socket.join(roomID);
    if (!hostSocketID) {
      hostSocketID = socket.id;
    }
    console.log("Joined room" + roomID);
  });
  socket.on("play", (room) => {
    if (socket.id === hostSocketID) {
      io.to(room).emit("play");
    }
  });

  socket.on("pause", (room) => {
    if (socket.id === hostSocketID) {
      io.to(room).emit("pause");
    }
  });

  socket.on("search", ({ partyID, id }) => {
    io.to(partyID).emit("search", id);
  });
  socket.on("duration", ({ partyID, seconds }) => {
    if (socket.id === hostSocketID) {
      io.to(partyID).emit("duration", seconds);
    }
  });
});

server.listen(3000, () => {
  console.log("listening on port 3000");
});

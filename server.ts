// imprt dotenv
import dotenv from "dotenv";
dotenv.config();
import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import { initializeSocket } from "./Services/socket";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import taskRoutes from "./routes/jobRoutes";
import messageRoute from "./routes/messageRoute";
import supportRoute from "./routes/supportRoute";
import jobRoutes from "./routes/jobRoutes";
import companyRoutes from "./routes/companyRoutes";

const app: Express = express();
const allowedOrigins = [
  "https://crack-jobs.vercel.app/",
  "https://crack-jobs.vercel.app",
  "http://localhost:3000",
  "http://192.168.29.48:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


const httpServer = createServer(app);

// Socket.IO initialization here
initializeSocket(httpServer);

//All Routes

app.use("/auth", authRoutes);

app.use("/profile", userRoutes)

app.use("/company", companyRoutes)

app.use("/jobs", jobRoutes);

app.use("/tasks", taskRoutes);

app.use("/messages", messageRoute)

app.use("/support", supportRoute)


// this is for testing routes
app.get("/", (req: Request, res: Response) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/allrooms", (req: Request, res: Response) => {
  res.send({});
});

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`Server is running on port ${PORT}`);
});

function gracefullshutdown(type: string) {
  process.on(type, () => {
    console.log(`${type} signal received: closing HTTP server`);
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

gracefullshutdown('SIGINT');
gracefullshutdown('SIGTERM');

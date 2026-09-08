import { Router, type IRouter } from "express";
import { requireUser } from "../middlewares/auth";
import healthRouter from "./health";
import discoveryRouter from "./discovery";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
// Health is intentionally public for deployment liveness checks. Every other
// route must establish an individual Clerk identity before it reaches a handler.
router.use(requireUser);
router.use(usersRouter);
router.use(discoveryRouter);

export default router;

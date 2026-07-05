import { Router, type IRouter } from "express";
import healthRouter from "./health";
import repurposeRouter from "./repurpose";
import videoScriptRouter from "./video-script";

const router: IRouter = Router();

router.use(healthRouter);
router.use(repurposeRouter);
router.use(videoScriptRouter);

export default router;

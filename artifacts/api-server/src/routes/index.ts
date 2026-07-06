import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mediaRouter from "./media";
import policyCheckRouter from "./policy-check";
import remixRouter from "./remix";
import repurposeRouter from "./repurpose";
import videoScriptRouter from "./video-script";

const router: IRouter = Router();

router.use(healthRouter);
router.use(repurposeRouter);
router.use(videoScriptRouter);
router.use(mediaRouter);
router.use(remixRouter);
router.use(policyCheckRouter);

export default router;

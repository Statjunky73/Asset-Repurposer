import { Router, type IRouter } from "express";
import healthRouter from "./health";
import repurposeRouter from "./repurpose";

const router: IRouter = Router();

router.use(healthRouter);
router.use(repurposeRouter);

export default router;

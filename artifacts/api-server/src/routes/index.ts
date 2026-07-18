import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import vehiclesRouter from "./vehicles";
import diagnosticsRouter from "./diagnostics";
import dtcRouter from "./dtc";
import maintenanceRouter from "./maintenance";
import aiRouter from "./ai";
import subscriptionsRouter from "./subscriptions";
import adminRouter from "./admin";
import fuelRouter from "./fuel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(vehiclesRouter);
router.use(diagnosticsRouter);
router.use(dtcRouter);
router.use(maintenanceRouter);
router.use(aiRouter);
router.use(subscriptionsRouter);
router.use(adminRouter);
router.use(fuelRouter);

export default router;

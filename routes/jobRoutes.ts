import { Router } from "express";
import { listJobs, getJob, searchJobs, applyJob, postJob, getPostedJobs, getJobCandidates, deleteJob } from "../Controllers/jobController";
import { authenticateUser, authorizeRoles } from "../Middlewares/authMiddleware";

const router = Router();

//////////////////////////public routes////////////////////////////
router.get("/", listJobs);
router.get("/search", searchJobs);
router.get("/:id", getJob);

//////////////////////////seeker routes////////////////////////////
router.post(
    "/:id/apply",
    authenticateUser,
    authorizeRoles("SEEKER"),
    applyJob
);

//////////////////////////poster routes////////////////////////////
router.post(
    "/postJob",
    authenticateUser,
    authorizeRoles("POSTER"),
    postJob
);
router.get(
    "/my/posted",
    authenticateUser,
    authorizeRoles("POSTER"),
    getPostedJobs
);
router.get(
    "/:id/candidates",
    authenticateUser,
    authorizeRoles("POSTER"),
    getJobCandidates
);

//////////////////////////admin routes////////////////////////////
router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("ADMIN"),
    deleteJob
);

export default router;

import { Router } from "express";
import express from "express";
import { createOrder, getPlans, verifyPayment } from "../Controllers/paymentController";
import { razorpayWebhook } from "../Controllers/webhookController";
import { get } from "http";
const router = Router();

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.post("/webhook", express.json({ type: "*/*" }), razorpayWebhook);

// plans
router.get("/plans", getPlans)

export default router;

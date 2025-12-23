import { Request, Response } from "express";
import crypto from "crypto";
import { createOrderService } from "../Services/paymentService";
import prisma from "../Connection/prisma";


export const createOrder = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const order = await createOrderService(amount);
    res.status(200).json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (error: any) {
    console.error("🔥 Razorpay Error:", error); // <-- This is the important part
    res.status(500).json({ error: error?.message || "Error creating Razorpay order" });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {

      // TODO: Update ticket/order/payment DB status
      res.status(200).json({ success: true, message: "Payment verified" });
      return
    }

    res.status(400).json({ success: false, message: "Invalid signature" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Verification failed" });
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany();
    res.status(200).json(plans);
   }
  catch (error) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
}
import { Request, Response } from "express";
import crypto from "crypto";

export const razorpayWebhook = async (req: Request, res: Response) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const signature = req.headers["x-razorpay-signature"] as string;

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (signature === expectedSignature) {
        console.log("Webhook verified:", req.body.event);

        // TODO: update DB subscription/payment status
        res.status(200).send("OK");
        return
    }

    res.status(400).send("Invalid webhook signature");
};

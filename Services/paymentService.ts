import { razorpay } from "../utils/razarpay";

export const createOrderService = async (amount: number) => {
    return await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
    });
};

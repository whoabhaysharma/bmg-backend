import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PaymentService = {
  async getAllPayments() {
    return prisma.payment.findMany({
      include: {
        subscription: true,
      },
    });
  },

  async getPaymentById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });
  },

  async createPayment(data: { subscriptionId: string; amount: number; method?: string; status?: string }) {
    return prisma.payment.create({
      data,
    });
  },

  async updatePayment(id: string, data: Partial<{ amount: number; method: string; status: string }>) {
    return prisma.payment.update({
      where: { id },
      data,
    });
  },

  async deletePayment(id: string) {
    return prisma.payment.delete({
      where: { id },
    });
  },
};
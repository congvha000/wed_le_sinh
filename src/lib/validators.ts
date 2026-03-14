import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().min(3, "Tài khoản quá ngắn").max(100),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2, "Họ tên quá ngắn"),
  phone: z.string().min(8, "Số điện thoại không hợp lệ").max(20),
});

export const approveUserSchema = z.object({
  userId: z.string().cuid(),
});

export const assignMembersSchema = z.object({
  pairId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).length(2),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Thiếu mật khẩu hiện tại"),
    newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
    confirmPassword: z.string().min(6, "Mật khẩu xác nhận tối thiểu 6 ký tự"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const adminResetPasswordSchema = z.object({
  userId: z.string().cuid(),
  newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const deleteUserSchema = z.object({
  userId: z.string().cuid(),
});

export const createPairSchema = z.object({
  name: z.string().min(2, "Tên cặp quá ngắn"),
  level: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]),
});

export const updatePairSchema = z.object({
  pairId: z.string().cuid(),
  level: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]).optional(),
  pointDelta: z.number().optional(),
  reason: z.string().max(200).optional(),
});

export const createServiceSchema = z.object({
  title: z.string().min(3, "Tiêu đề quá ngắn"),
  type: z.enum(["REGULAR", "SOLEMN", "FOUR_PEOPLE", "ADORATION"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  points: z.number().min(0),
  status: z.enum(["DRAFT", "PUBLISHED", "LOCKED", "COMPLETED"]).default("PUBLISHED"),
});

export const deleteServiceSchema = z.object({
  serviceId: z.string().cuid(),
});

export const assignServiceSchema = z.object({
  serviceId: z.string().cuid(),
  role: z.enum(["GENERAL", "CANDLE", "INCENSE"]),
  pairId: z.string().cuid(),
});
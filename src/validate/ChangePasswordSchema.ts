import { z } from 'zod';

export const changePasswordSchema = z
    .object({
        currentPassword: z
            .string()
            .min(1, 'Mật khẩu hiện tại không được để trống')
            .min(6, 'Mật khẩu hiện tại phải có ít nhất 6 ký tự'),
        newPassword: z
            .string()
            .min(1, 'Mật khẩu mới không được để trống')
            .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
        confirmNewPassword: z
            .string()
            .min(1, 'Xác nhận mật khẩu mới không được để trống')
            .min(6, 'Xác nhận mật khẩu mới phải có ít nhất 6 ký tự'),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: 'Mật khẩu xác nhận không trùng khớp',
        path: ['confirmNewPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: 'Mật khẩu mới không được trùng mật khẩu hiện tại',
        path: ['newPassword'],
    });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function validateChangePasswordForm(data: ChangePasswordFormData) {
    const result = changePasswordSchema.safeParse(data);

    if (result.success) {
        return {};
    }

    const errors: Partial<Record<keyof ChangePasswordFormData, string>> = {};

    result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ChangePasswordFormData;

        if (!errors[field]) {
            errors[field] = issue.message;
        }
    });

    return errors;
}

import { z } from 'zod';

export const loginSchema = z.object({
    phone: z
        .string()
        .min(1, 'Số điện thoại không được để trống'),
    // .regex(
    //     /^(0|\+84)[0-9]{9}$/,
    //     'Số điện thoại không hợp lệ',
    // ),

    password: z
        .string()
        .min(1, 'Mật khẩu không được để trống')
        .min(3, 'Mật khẩu phải ít nhất 6 ký tự'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function validateLoginForm(data: LoginFormData) {
    const result = loginSchema.safeParse(data);

    if (result.success) {
        return {};
    }

    const errors: Partial<Record<keyof LoginFormData, string>> = {};

    result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormData;

        if (!errors[field]) {
            errors[field] = issue.message;
        }
    });

    return errors;
}

export function validateLoginField(
    field: keyof LoginFormData,
    value: string,
) {
    const result = loginSchema.shape[field].safeParse(value);

    if (result.success) {
        return undefined;
    }

    return result.error.issues[0]?.message;
}
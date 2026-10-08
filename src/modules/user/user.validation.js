const { z } = require('zod');

const updateUserSchema = z.object({
    name: z.string().min(3, 'Tên người dùng phải có ít nhất 3 ký tự').optional(),
    avatar: z.string().optional()
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

const createUserAddressSchema = z.object({
    receiverName: z.string().min(2, 'Tên người nhận phải có ít nhất 2 ký tự'),
    receiverPhone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Số điện thoại không hợp lệ'),
    addressDetail: z.string().min(5, 'Địa chỉ chi tiết phải có ít nhất 5 ký tự'),
    isDefault: z.boolean().optional()
});

const updateUserAddressSchema = z.object({
    receiverName: z.string().min(2, 'Tên người nhận phải có ít nhất 2 ký tự').optional(),
    receiverPhone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Số điện thoại không hợp lệ').optional(),
    addressDetail: z.string().min(5, 'Địa chỉ chi tiết phải có ít nhất 5 ký tự').optional(),
    isDefault: z.boolean().optional()
});

module.exports = { updateUserSchema, changePasswordSchema, createUserAddressSchema, updateUserAddressSchema };
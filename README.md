# Hướng dẫn cài đặt và chạy project

## Cài đặt và chạy Project

**1. Cài đặt thư viện**

Chạy lệnh tại thư mục `ceramic_shop_server`:

```bash
npm install
```

**2. Cấu hình biến môi trường**

Tạo hoặc cập nhật file `.env` ở thư mục gốc của `ceramic_shop_server`. Thay `<username>` và `<password>` bằng thông tin PostgreSQL trên máy:

```env
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/ceramic_shop?schema=public"
```

**3. Khởi tạo database**

Đảm bảo PostgreSQL đang chạy và database `ceramic_shop` đã sẵn sàng, sau đó áp dụng các migration và sinh Prisma Client:

```bash
npx prisma migrate dev
```

**4. Khởi động server**

```bash
npm run dev
```

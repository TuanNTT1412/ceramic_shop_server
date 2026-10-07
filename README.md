# Hướng dẫn cài đặt và chạy project

## Cài đặt và chạy Project

**1. Cài đặt thư viện**

Chạy lệnh tại thư mục `ceramic_shop_server`:

```bash
npm install
```

**2. Cấu hình biến môi trường**

Tạo hoặc cập nhật file `.env` ở thư mục gốc của `ceramic_shop_server`. Cập nhật `<username>` và `<password>`:

```env
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/ceramic_shop?schema=public"
```

**3. Khởi tạo database**

Thực hiện lệnh migration và sinh Prisma Client:

```bash
npx prisma migrate dev
```

**4. Khởi động server**

```bash
npm run dev
```

## Hướng dẫn Code (Coding Guidelines)

### 1. Quy tắc đặt tên hàm (Naming Convention)

Áp dụng công thức đặt tên hàm:
**[Động từ] + [Đối tượng] + [Modifier]**

_Các động từ chuẩn: `get` (Lấy), `create` (Tạo), `update` (Cập nhật), `delete` (Xóa), `cancel` (Hủy)._

**Quy định sử dụng Modifier:**

- **Không dùng Modifier:** Dành cho API public.
  - _Ví dụ:_ `getProducts`, `getCategoryDetail`.
  - _Lưu ý:_ Các chức năng mặc định chỉ cấp cho quản trị (như thêm/sửa/xóa sản phẩm) không cần sử dụng modifier (sử dụng `createProduct`, `deleteCategory`).

- **Tiền tố `My`:** Dành cho API xử lý dữ liệu của user đang đăng nhập.
  - _Ví dụ:_ `getMyOrders`, `cancelMyOrder`, `updateMyProfile`.

- **Hậu tố `ForAdmin`:** Dành cho API quản trị có logic khác biệt so với user thông thường.
  - _Ví dụ:_ `getProductsForAdmin`, `getAllOrders`.

### 2. Quy tắc tổ chức file (Structure)

- **Tầng Route:** Gom nhóm các API theo chức năng hoặc đối tượng bằng comment. Gắn middleware bảo vệ trực tiếp vào từng route tương ứng.
- **Tầng Controller & Service:** Gộp logic của Admin và Customer vào 1 file duy nhất (vd: `order.service.js`). Phân định quyền qua tên hàm. Không chia nhỏ thành quá nhiều file.

## Quy trình Git (Git Workflow)

### 1. Merge nhánh vào `main`

- Khi hoàn thành tính năng trên nhánh phụ, nếu code hoạt động ổn định, thực hiện merge trực tiếp vào `main`.
- **Bắt buộc:** Phải fetch và merge code mới nhất từ `main` về nhánh phụ để xử lý conflict (nếu có) trước khi push lên `main`.

### 2. Xử lý Conflict và Merge

Thực hiện tuần tự các bước sau:

**Bước 1: Lấy code mới nhất từ nhánh `main`**

```bash
git fetch origin main
```

**Bước 2: Merge code từ `main` vào nhánh hiện tại**

```bash
git merge origin/main
```

**Bước 3: Xử lý conflict**

- Mở các file bị báo lỗi conflict.
- Kiểm tra các phần `<<<<<<< HEAD` và `>>>>>>> origin/main`.
- Chọn giữ đoạn code tương ứng (Current Change, Incoming Change, hoặc Both Changes). Đảm bảo không bị lỗi cú pháp.
- Lưu lại các thay đổi.

**Bước 4: Commit thay đổi sau khi fix conflict**

```bash
git add .
git commit -m "Fix conflicts with main"
```

**Bước 5: Đưa code lên nhánh `main`**

Chọn 1 trong 2 cách sau:

**Cách 1: Sử dụng Git Command (Terminal)**
```bash
git checkout main
git merge <tên_nhánh_phụ>
git push origin main
```

**Cách 2: Sử dụng GitHub Pull Request (Khuyên dùng)**
- Push nhánh phụ lên GitHub bằng lệnh: `git push origin <tên_nhánh_phụ>`
- Truy cập trang kho lưu trữ (repository) trên GitHub.
- Bấm nút **Compare & pull request** màu xanh lá.
- Kiểm tra thay đổi và bấm **Create pull request**.
- Bấm **Merge pull request** để hoàn tất việc hợp nhất vào `main`.

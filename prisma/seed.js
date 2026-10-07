const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Đang nạp dữ liệu (Seeding)...");

  // Mã hóa mật khẩu "123456"
  const hashedPassword = await bcrypt.hash("123456", 10);

  // 1. Tạo tài khoản STAFF
  const staff = await prisma.user.upsert({
    where: { email: "staff@ceramic.com" },
    update: {}, // Nếu tài khoản đã tồn tại thì bỏ qua
    create: {
      email: "staff@ceramic.com",
      name: "Nhân Viên Bán Hàng",
      password: hashedPassword,
      role: Role.STAFF,
    },
  });

  // 2. Tạo tài khoản ADMIN
  const admin = await prisma.user.upsert({
    where: { email: "admin@ceramic.com" },
    update: {},
    create: {
      email: "admin@ceramic.com",
      name: "Quản Lý Cửa Hàng",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log("✅ Tạo thành công!");
  console.log("👤 STAFF Account: staff@ceramic.com | Pass: 123456");
  console.log("👑 ADMIN Account: admin@ceramic.com | Pass: 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const detailCols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'OrderDetail';
  `;
  console.log("Cột trong bảng OrderDetail:");
  console.table(detailCols);
  await prisma.$disconnect();
}

check();

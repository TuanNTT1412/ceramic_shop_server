const { PrismaClient, Role, DeliveryType, PaymentMethod, PaymentStatus, OrderStatus, ShippingProvider } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Thiết lập dữ liệu ngẫu nhiên có quy luật
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomWeighted(items, weights) {
  const total = weights.reduce((acc, w) => acc + w, 0);
  let threshold = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🚀 Bắt đầu quá trình nạp dữ liệu gốm sứ giả lập vào PostgreSQL...");

  // 1. DANH MỤC GỐM SỨ
  const categoriesData = [
    { name: "Ấm Chén & Trà Cụ Bát Tràng", description: "Bộ ấm chén tử sa, men hỏa biến, men rạn truyền thống" },
    { name: "Bình Hoa & Lộc Bình Phong Thủy", description: "Bình hút tài lộc, lọ lộc bình cắm cành đại" },
    { name: "Bát Đĩa & Dụng Cụ Bàn Ăn", description: "Bộ bát đĩa men ngọc, men lam cổ, gốm mộc gia đình" },
    { name: "Tượng Gốm & Đồ Thờ Tâm Linh", description: "Tượng Di Lặc, Thần Tài, bộ đồ thờ men rạn đắp nổi" },
    { name: "Gốm Trang Trí & Đèn Xông", description: "Đèn xông tinh dầu gốm, thác nước phong thủy mini" }
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (existing) {
      categories.push(existing);
    } else {
      const created = await prisma.category.create({ data: cat });
      categories.push(created);
    }
  }
  console.log(`✅ Đã chuẩn bị ${categories.length} danh mục sản phẩm.`);

  // 2. SẢN PHẨM & BIẾN THỂ (PRODUCTS & VARIANTS)
  const productsSpec = [
    // Danh mục 1: Ấm chén
    {
      catIdx: 0,
      name: "Bộ Ấm Chén Tử Sa Bát Tràng Dáng Chuông",
      desc: "Chế tác thủ công từ đất tử sa cao cấp giữ nhiệt và lưu hương trà lâu dài.",
      variants: [
        { name: "Nâu đất - Kèm 6 chén + khay", price: 680000, stock: 45 },
        { name: "Đỏ gạch - Kèm 6 chén + khay", price: 720000, stock: 30 }
      ]
    },
    {
      catIdx: 0,
      name: "Bộ Trà Men Hỏa Biến Đại Cát",
      desc: "Men hỏa biến nung ở 1300 độ C tạo vân độc bản không trùng lặp.",
      variants: [
        { name: "Xanh đại dương - 1 ấm 6 chén", price: 850000, stock: 60 },
        { name: "Xanh rêu ngọc - 1 ấm 6 chén", price: 890000, stock: 40 }
      ]
    },
    {
      catIdx: 0,
      name: "Bộ Ấm Chén Men Rạn Bọc Đồng Cổ Điển",
      desc: "Men rạn họa tiết sơn thủy bọc đồng tinh xảo sang trọng.",
      variants: [
        { name: "Bọc đồng nguyên chất - Bộ VIP", price: 1450000, stock: 25 },
        { name: "Men rạn mộc truyền thống", price: 950000, stock: 35 }
      ]
    },

    // Danh mục 2: Bình hoa & Lộc bình
    {
      catIdx: 1,
      name: "Bình Hút Lộc Men Lam Vẽ Vàng Thuận Buồm Xuôi Gió",
      desc: "Bình phong thủy dáng củ tỏi hút tài giữ của cho gia chủ.",
      variants: [
        { name: "Vẽ vàng 24K - Chiều cao 35cm", price: 1850000, stock: 20 },
        { name: "Men lam cổ - Chiều cao 30cm", price: 1200000, stock: 35 }
      ]
    },
    {
      catIdx: 1,
      name: "Lọ Hoa Gốm Mộc Vuốt Tay Dáng Chuông",
      desc: "Chuyên cắm cành đào, tuyết mai, hoa sen phong cách tối giản mộc mạc.",
      variants: [
        { name: "Men thô mộc - Size L (Cao 40cm)", price: 420000, stock: 80 },
        { name: "Men cát cháy - Size M (Cao 28cm)", price: 320000, stock: 95 }
      ]
    },
    {
      catIdx: 1,
      name: "Cặp Lộc Bình Men Rạn Đắp Nổi Tứ Quý 1m4",
      desc: "Hàng nghệ nhân đắp tay nổi kênh bong cảnh Tùng Cúc Trúc Mai.",
      variants: [
        { name: "Cao 1m4 kèm chân đế gỗ", price: 8500000, stock: 8 }
      ]
    },

    // Danh mục 3: Bát đĩa
    {
      catIdx: 2,
      name: "Bộ Bát Đĩa Men Ngọc Hoàng Gia 22 Món",
      desc: "Bát đĩa tráng men xanh ngọc cao cấp an toàn lò vi sóng máy rửa bát.",
      variants: [
        { name: "Bộ đầy đủ 22 món cho 6 người", price: 1650000, stock: 50 },
        { name: "Bộ cơ bản 12 món gia đình", price: 980000, stock: 70 }
      ]
    },
    {
      catIdx: 2,
      name: "Bộ Bát Cơm Gốm Mộc Nhật Bản (Set 6 chiếc)",
      desc: "Họa tiết vẽ tay vân sóng biển phong cách wabi-sabi thanh tịnh.",
      variants: [
        { name: "Set 6 bát cơm men tro xám", price: 280000, stock: 120 },
        { name: "Set 6 bát cơm men lam cá chép", price: 320000, stock: 110 }
      ]
    },

    // Danh mục 4: Tượng & Đồ thờ
    {
      catIdx: 3,
      name: "Tượng Phật Di Lặc Cầm Gậy Như Ý Men Hỏa Biến",
      desc: "Tượng phong thủy mang may mắn an lạc và tài lộc cho không gian sống.",
      variants: [
        { name: "Chiều cao 25cm - Men Hỏa Biến", price: 890000, stock: 30 },
        { name: "Chiều cao 35cm - Men Ngọc Bích", price: 1350000, stock: 18 }
      ]
    },
    {
      catIdx: 3,
      name: "Bát Hương Men Rạn Đắp Nổi Song Long Chầu Nguyệt",
      desc: "Bát hương linh thiêng men rạn nung nhiệt độ cao đắp nổi rồng uy nghi.",
      variants: [
        { name: "Đường kính 18cm (Phi 18)", price: 650000, stock: 40 },
        { name: "Đường kính 22cm (Phi 22)", price: 920000, stock: 25 }
      ]
    },

    // Danh mục 5: Trang trí & Khác
    {
      catIdx: 4,
      name: "Đèn Xông Tinh Dầu Gốm Thấu Quang Bát Tràng",
      desc: "Ánh sáng xuyên qua lớp xương gốm mỏng kết hợp hương tinh dầu thơm phòng.",
      variants: [
        { name: "Dáng trứng họa tiết sen vàng", price: 220000, stock: 150 },
        { name: "Dáng trụ họa tiết phố cổ Hà Nội", price: 240000, stock: 130 }
      ]
    },
    {
      catIdx: 4,
      name: "Thác Nước Phong Thủy Gốm Chảy Tự Động",
      desc: "Tiếng nước chảy róc rách thanh tịnh thư giãn cho bàn làm việc.",
      variants: [
        { name: "Men rêu cổ kèm cối xay nước", price: 580000, stock: 35 }
      ]
    }
  ];

  const allVariants = [];
  for (const p of productsSpec) {
    const category = categories[p.catIdx];
    let product = await prisma.product.findFirst({ where: { name: p.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          description: p.desc,
          categoryId: category.id,
          isActive: true
        }
      });
    }

    for (const v of p.variants) {
      let variant = await prisma.productVariant.findFirst({
        where: { productId: product.id, variantName: v.name }
      });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            variantName: v.name,
            price: v.price,
            stockQuantity: v.stock
          }
        });
      }
      allVariants.push({
        ...variant,
        productName: product.name,
        categoryId: category.id
      });
    }
  }
  console.log(`✅ Đã nạp ${productsSpec.length} sản phẩm với ${allVariants.length} biến thể phân loại.`);

  // 3. TẠO KHÁCH HÀNG (USERS & ADDRESSES)
  const defaultPassword = await bcrypt.hash("123456", 10);
  const cities = [
    "Hà Nội", "Hà Nội", "Hà Nội", // Trọng số cao
    "TP. Hồ Chí Minh", "TP. Hồ Chí Minh",
    "Đà Nẵng", "Hải Phòng", "Bắc Ninh", "Hưng Yên", "Quảng Ninh"
  ];
  const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
  const dem = ["Văn", "Thị", "Đức", "Minh", "Thanh", "Ngọc", "Thu", "Xuân", "Hải", "Tuấn"];
  const ten = ["Anh", "Bình", "Cường", "Dũng", "Giang", "Hương", "Huy", "Khoa", "Linh", "Mai", "Nam", "Phúc", "Quân", "Thảo", "Trang", "Tùng"];

  const customers = [];
  const existingUsers = await prisma.user.findMany({ where: { role: Role.CUSTOMER }, take: 50 });

  if (existingUsers.length >= 40) {
    customers.push(...existingUsers);
  } else {
    for (let i = 1; i <= 50; i++) {
      const fullName = `${randomChoice(ho)} ${randomChoice(dem)} ${randomChoice(ten)}`;
      const email = `khachhang${i}_${randomInt(100, 999)}@gmail.com`;
      const user = await prisma.user.create({
        data: {
          name: fullName,
          email: email,
          password: defaultPassword,
          role: Role.CUSTOMER,
          addresses: {
            create: {
              receiverName: fullName,
              receiverPhone: `09${randomInt(10000000, 99999999)}`,
              addressDetail: `Số ${randomInt(1, 150)}, Phố ${randomChoice(ten)}, ${randomChoice(cities)}`,
              isDefault: true
            }
          }
        },
        include: { addresses: true }
      });
      customers.push(user);
    }
  }
  console.log(`✅ Đã có ${customers.length} khách hàng trong cơ sở dữ liệu.`);

  // 4. TẠO ĐƠN HÀNG (ORDERS & ORDER_DETAILS) TRONG 6 THÁNG
  const startDate = new Date(2026, 4, 1); // 01/05/2026
  const endDate = new Date(2026, 9, 14);   // 14/10/2026
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

  console.log(`⏳ Đang sinh dữ liệu đơn hàng trong vòng ${totalDays} ngày (05/2026 - 10/2026)...`);

  const cancelReasons = [
    "Hàng bị nứt vỡ trong quá trình vận chuyển",
    "Khách đổi ý không còn nhu cầu",
    "Men gốm không đúng màu yêu cầu",
    "Thời gian giao hàng lâu hơn dự kiến",
    "Khách không nghe máy khi shipper gọi giao",
    "Hàng bị trầy xước bao bì"
  ];

  let orderCount = 0;
  const shippingProviders = [ShippingProvider.GHTK, ShippingProvider.VTP, ShippingProvider.VNPOST, ShippingProvider.AHAMOVE];

  for (let d = 0; d <= totalDays; d++) {
    const curDate = new Date(startDate);
    curDate.setDate(curDate.getDate() + d);
    const dayOfWeek = curDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Cuối tuần lượng đơn cao hơn
    const dailyOrders = isWeekend ? randomInt(6, 12) : randomInt(3, 7);

    for (let o = 0; o < dailyOrders; o++) {
      orderCount++;
      const customer = randomChoice(customers);
      const address = customer.addresses && customer.addresses.length > 0 
        ? customer.addresses[0] 
        : { receiverName: customer.name, receiverPhone: "0912345678", addressDetail: "Hà Nội" };

      // Giờ đặt hàng tập trung từ 9h - 22h
      const hour = randomWeighted([9, 10, 11, 12, 14, 15, 16, 19, 20, 21, 22], [5, 8, 9, 7, 7, 8, 9, 12, 14, 11, 6]);
      const minute = randomInt(0, 59);
      const second = randomInt(0, 59);
      const orderDate = new Date(curDate);
      orderDate.setHours(hour, minute, second);

      // Kênh nhận hàng & Thanh toán
      const deliveryType = randomWeighted([DeliveryType.SHIPPING, DeliveryType.PICKUP], [85, 15]);
      const paymentMethod = randomWeighted([PaymentMethod.COD, PaymentMethod.PAYOS], [60, 40]);

      // Tỷ lệ trạng thái: 88% Hoàn thành, 8% Hủy/Hoàn trả, 4% Đang xử lý
      let orderStatus;
      let paymentStatus;
      let cancelReason = null;

      const statusRand = Math.random();
      if (statusRand < 0.88) {
        orderStatus = OrderStatus.COMPLETED;
        paymentStatus = PaymentStatus.PAID;
      } else if (statusRand < 0.96) {
        orderStatus = OrderStatus.CANCELED;
        paymentStatus = PaymentStatus.UNPAID;
        cancelReason = randomChoice(cancelReasons);
      } else {
        orderStatus = randomChoice([OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.PENDING]);
        paymentStatus = paymentMethod === PaymentMethod.PAYOS ? PaymentStatus.PAID : PaymentStatus.UNPAID;
      }

      const shippingFee = deliveryType === DeliveryType.SHIPPING ? (randomChoice([30000, 35000, 45000, 50000])) : 0;
      const orderCode = `GM${orderDate.getFullYear().toString().slice(-2)}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}${orderCount.toString().padStart(5, '0')}`;

      // Chọn 1-3 sản phẩm trong đơn
      const numItems = randomWeighted([1, 2, 3], [75, 20, 5]);
      const selectedVariants = [];
      for (let i = 0; i < numItems; i++) {
        const v = randomChoice(allVariants);
        selectedVariants.push(v);
      }

      let subTotalSum = 0;
      const orderDetailsData = selectedVariants.map(v => {
        const qty = randomWeighted([1, 2], [90, 10]);
        const sub = qty * v.price;
        subTotalSum += sub;
        return {
          productId: v.productId,
          variantId: v.id,
          productName: v.productName,
          classification: v.variantName,
          unitPrice: v.price,
          quantity: qty,
          subTotal: sub
        };
      });

      const totalAmount = subTotalSum + shippingFee;

      await prisma.order.create({
        data: {
          orderCode: orderCode,
          customerId: customer.id,
          receiverName: address.receiverName,
          receiverPhone: address.receiverPhone,
          deliveryType: deliveryType,
          deliveryAddress: deliveryType === DeliveryType.SHIPPING ? address.addressDetail : null,
          shippingFee: shippingFee,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          paymentStatus: paymentStatus,
          orderStatus: orderStatus,
          shippingProvider: deliveryType === DeliveryType.SHIPPING ? randomChoice(shippingProviders) : null,
          trackingCode: deliveryType === DeliveryType.SHIPPING ? `VN${randomInt(100000000, 999999999)}` : null,
          cancelReason: cancelReason,
          createdAt: orderDate,
          updatedAt: orderDate,
          orderDetails: {
            create: orderDetailsData
          }
        }
      });
    }
  }

  console.log(`\n🎉 NẠP THÀNH CÔNG ${orderCount} ĐƠN HÀNG VÀO POSTGRESQL!`);
  console.log("   - Bảng Category: Đã có đủ danh mục gốm sứ");
  console.log("   - Bảng Product & ProductVariant: Đã có đủ sản phẩm và các loại men");
  console.log("   - Bảng User: Đã có danh sách khách hàng");
  console.log("   - Bảng Order & OrderDetail: Đã có hàng trăm đơn hàng thực tế kèm lý do đổi trả/hủy đơn.");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi nạp dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

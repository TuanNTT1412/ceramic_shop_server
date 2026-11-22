/**
 * scripts/sync_cloudinary_vases.js
 * ========================================================
 * 1. Tự động sao lưu dữ liệu cũ (Orders, Products, v.v.) ra file JSON dự phòng.
 * 2. Làm sạch (clean) dữ liệu mock cũ trong Database theo đúng ràng buộc quan hệ.
 * 3. Quét 21 bình thực tế từ Cloudinary velll47x.
 * 4. Tịnh tiến thứ tự số B (B1..B17 giữ nguyên, B19->B18, B20->B19, B21->B20, B22->B21).
 * 5. Tự sinh thông tin sản phẩm gốm sứ chân thực, giá cả, tồn kho, cờ isReturnable = false.
 * 6. Đặt ảnh front.jpg làm ảnh đại diện chính (isPrimary: true) và lưu các ảnh góc/chi tiết khác.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Cấu hình Cloudinary
const CLOUD_CONFIG = {
  cloud_name: 'velll47x',
  api_key: '832925522629552',
  api_secret: 'YZxcLiUx5_RqDHEHG3Ywnv6wXKI'
};

// Metadata sản phẩm sinh tự động cho 21 bình
const VASE_METADATA = {
  1: {
    name: "Bình Gốm Sứ Bát Tràng Dáng Tỏi Men Lam Cổ",
    desc: "Chế tác thủ công từ đất sét tinh luyện, men lam truyền thống vẽ họa tiết sơn thủy hữu tình, dáng tỏi phong thủy tụ khí sinh tài.",
    price: 850000,
    stock: 35
  },
  2: {
    name: "Bình Hút Lộc Men Rạn Đắp Nổi Hoa Sen",
    desc: "Dáng bình miệng loe cổ thắt bụng phình, họa tiết hoa sen đắp nổi tinh xảo, men rạn cổ Bát Tràng sang trọng.",
    price: 1250000,
    stock: 25
  },
  3: {
    name: "Bình Hoa Gốm Mộc Vuốt Tay Dáng Chuông",
    desc: "Gốm mộc vuốt tay thủ công 100%, nung nhiệt độ cao 1250 độ C, phù hợp cắm các loại hoa cành dáng cao hoặc trang trí phòng khách.",
    price: 650000,
    stock: 40
  },
  4: {
    name: "Bình Gốm Men Hỏa Biến Đại Cát",
    desc: "Nước men hỏa biến nung tầng nhiệt tạo sắc xanh lục biến ảo độc bản, không bình nào giống bình nào.",
    price: 920000,
    stock: 30
  },
  5: {
    name: "Bình Hút Tài Lộc Vẽ Vàng 24K Thuận Buồm Xuôi Gió",
    desc: "Dòng gốm sứ phong thủy cao cấp vẽ chỉ vàng kim 24K, biểu trưng cho sự hanh thông tài lộc và bình an gia đạo.",
    price: 1680000,
    stock: 15
  },
  6: {
    name: "Lọ Hoa Gốm Sứ Dáng Trụ Khắc Nổi Sen Vàng",
    desc: "Thân trụ thon dài thanh thoát, họa tiết cánh sen khắc nổi kết hợp tráng men hoàng lưu ly bắt mắt.",
    price: 580000,
    stock: 45
  },
  7: {
    name: "Bình Gốm Nghệ Thuật Dáng Giọt Nước Men Tro",
    desc: "Dáng giọt nước đương đại tối giản, men tro tự nhiên ấm áp, thích hợp không gian nội thất Zen và Wabi Sabi.",
    price: 790000,
    stock: 28
  },
  8: {
    name: "Bình Lộc Gốm Chu Đậu Tích Sơn Thủy",
    desc: "Phục dựng dòng men tro trấu Chu Đậu danh tiếng, nét vẽ phóng khoáng tái hiện non nước mây trời hữu tình.",
    price: 1450000,
    stock: 20
  },
  9: {
    name: "Bình Hoa Men Rạn Cổ Cẩn Đồng Bát Tràng",
    desc: "Men rạn tam thái cổ điển, viền miệng và đáy bọc đồng nguyên chất tinh xảo mang đậm phong vị hoài cổ.",
    price: 1150000,
    stock: 22
  },
  10: {
    name: "Bình Gốm Sứ Phong Thủy Dáng Tỳ Bà",
    desc: "Dáng đàn tỳ bà duyên dáng tượng trưng cho sự dịu dàng êm ấm, men ngọc thanh tao sáng bóng.",
    price: 720000,
    stock: 38
  },
  11: {
    name: "Bình Hút Lộc Men Lam Trắng Vẽ Cá Chép Trông Trăng",
    desc: "Họa tiết Lý Ngư Vọng Nguyệt vẽ thủ công mềm mại, men lam trắng Bát Tràng trong vắt chiều sâu.",
    price: 980000,
    stock: 30
  },
  12: {
    name: "Bình Hoa Gốm Mộc Nung Củi Tự Nhiên",
    desc: "Gốm nung củi truyền thống lưu lại vệt khói và tro tự nhiên trên bề mặt, mộc mạc và giàu hồn cốt đất Việt.",
    price: 880000,
    stock: 25
  },
  13: {
    name: "Bình Gốm Hỏa Biến Sắc Đỏ Hoàng Hôn",
    desc: "Sắc đỏ hổ phách chuyển tím huyền bí qua tầng nhiệt lò ga cao độ, dáng bầu tròn tròn trịa thịnh vượng.",
    price: 1350000,
    stock: 18
  },
  14: {
    name: "Lọ Hoa Dáng Mai Bình Men Hoàng Gia",
    desc: "Mai bình thanh tú miệng thắt đáy nở, nước men vàng hoàng gia quý phái tôn lên vẻ sang trọng của căn nhà.",
    price: 1100000,
    stock: 20
  },
  15: {
    name: "Bình Gốm Chu Đậu Họa Tiết Hoa Cúc Dây",
    desc: "Gốm Chu Đậu men trấu vẽ chỉ hoa cúc dây - loài hoa tượng trưng cho sự trường thọ và thanh cao.",
    price: 950000,
    stock: 32
  },
  16: {
    name: "Bình Gốm Nghệ Thuật Vuốt Tay Dáng Độc Bản",
    desc: "Thiết kế tạo hình phá cách với đường cong vuốt tay ngẫu hứng của nghệ nhân, nước men satin mịn màng.",
    price: 750000,
    stock: 24
  },
  17: {
    name: "Bình Hút Lộc Đắp Nổi Tứ Quý Tùng Cúc Trúc Mai",
    desc: "Tứ cảnh bốn mùa xuân hạ thu đông đắp kênh bong sống động, mang lời chúc phúc bốn mùa an khang thịnh vượng.",
    price: 1550000,
    stock: 16
  },
  18: {
    name: "Bình Hoa Gốm Phủ Men Rạn Chỉ Đen Dáng Bầu Dục",
    desc: "Men rạn nứt tự nhiên đi chỉ đen tinh tế, dáng bầu dục hiện đại phù hợp bàn làm việc hoặc kệ sách.",
    price: 620000,
    stock: 35
  },
  19: {
    name: "Bình Gốm Sứ Dáng Trứng Men Ngọc Lục Bảo",
    desc: "Thân bình hình trứng tròn đầy đặn chứa chan sinh khí, sắc xanh lục bảo bóng như ngọc quý.",
    price: 890000,
    stock: 28
  },
  20: {
    name: "Bình Lộc Men Khử Nung Luyện Cao Cấp",
    desc: "Dòng men khử tạp chất ở 1320 độ C cho cốt sứ đanh chắc như chuông, vân men sâu hút ánh nhìn.",
    price: 1280000,
    stock: 20
  },
  21: {
    name: "Bình Hoa Men Hỏa Biến Vũ Trụ Ngàn Sao",
    desc: "Nước men hỏa biến đốm sao lấp lánh như dải ngân hà, dáng cao bề thế cắm hoa đại hoặc trưng bày độc bản.",
    price: 1420000,
    stock: 15
  }
};

// Gọi Cloudinary REST API lấy toàn bộ tài nguyên ảnh
function fetchCloudinaryImages() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLOUD_CONFIG.api_key}:${CLOUD_CONFIG.api_secret}`).toString('base64');
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_CONFIG.cloud_name}/resources/image/upload?prefix=ceramic_shop/products/&max_results=500`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.resources || []);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function backupCurrentData() {
  console.log("📦 [1/6] Đang tiến hành sao lưu dữ liệu hiện tại trước khi clean...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(__dirname, `..`, `backup_before_clean_${timestamp}.json`);

  const [products, variants, images, orders, orderDetails, returnRequests, refunds] = await Promise.all([
    prisma.product.findMany(),
    prisma.productVariant.findMany(),
    prisma.variantImage.findMany(),
    prisma.order.findMany(),
    prisma.orderDetail.findMany(),
    prisma.returnRequest.findMany(),
    prisma.refund.findMany()
  ]);

  const backupData = {
    timestamp: new Date().toISOString(),
    stats: {
      products: products.length,
      variants: variants.length,
      images: images.length,
      orders: orders.length,
      orderDetails: orderDetails.length,
      returnRequests: returnRequests.length,
      refunds: refunds.length
    },
    products,
    variants,
    images,
    orders,
    orderDetails,
    returnRequests,
    refunds
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✅ Đã sao lưu thành công ra file: ${backupFile}`);
}

async function cleanOldMockData() {
  console.log("🧹 [2/6] Đang xóa sạch dữ liệu cũ theo đúng trình tự khóa ngoại...");
  await prisma.$transaction([
    prisma.refund.deleteMany(),
    prisma.returnRequest.deleteMany(),
    prisma.aiInspection.deleteMany(),
    prisma.review.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.orderDetail.deleteMany(),
    prisma.order.deleteMany(),
    prisma.variantImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany()
  ]);
  console.log("✅ Đã dọn sạch các bảng dữ liệu sản phẩm và đơn hàng mock cũ.");
}

async function ensureCategory() {
  console.log("🏷️ [3/6] Xác định danh mục sản phẩm chuẩn...");
  const catName = "Bình Hoa & Lộc Bình Phong Thủy";
  let cat = await prisma.category.findFirst({ where: { name: catName } });
  if (!cat) {
    cat = await prisma.category.create({
      data: {
        name: catName,
        description: "Bình hút tài lộc, lọ lộc bình cắm hoa nghệ thuật Bát Tràng"
      }
    });
    console.log(`✅ Đã tạo mới danh mục: ${catName}`);
  } else {
    console.log(`✅ Sử dụng danh mục hiện hữu: ${catName} (ID: ${cat.id})`);
  }
  return cat;
}

async function main() {
  console.log("=================================================================");
  console.log("   ĐỒNG BỘ 21 BÌNH GỐM SỨ TỪ CLOUDINARY VÀO POSTGRESQL (PRISMA)   ");
  console.log("=================================================================");

  // 1. Sao lưu an toàn
  await backupCurrentData();

  // 2. Làm sạch dữ liệu cũ
  await cleanOldMockData();

  // 3. Danh mục
  const category = await ensureCategory();

  // 4. Quét Cloudinary
  console.log("☁️ [4/6] Đang kết nối Cloudinary quét 21 bình...");
  const resources = await fetchCloudinaryImages();
  console.log(`✅ Tìm thấy tổng cộng ${resources.length} tài nguyên ảnh trên Cloudinary.`);

  // Nhóm tài nguyên theo folder gốc Cloudinary: B1..B17, B19, B20, B21, B22
  const grouped = {};
  for (const r of resources) {
    const parts = r.public_id.split('/');
    if (parts.length >= 3) {
      const origB = parts[2]; // e.g. B1, B2, B19
      if (!grouped[origB]) grouped[origB] = [];
      grouped[origB].push(r);
    }
  }

  // Thứ tự lấy từ Cloudinary: B1..B17, B19, B20, B21, B22
  const cloudinarySourceKeys = [
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10',
    'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17',
    'B19', 'B20', 'B21', 'B22'
  ];

  console.log("📦 [5/6] Đang tịnh tiến thứ tự số B (B1..B21) và nạp vào DB...");

  const createdProducts = [];

  for (let i = 0; i < cloudinarySourceKeys.length; i++) {
    const origKey = cloudinarySourceKeys[i];
    const newSeq = i + 1; // 1 to 21
    const newSku = `B${newSeq}`;
    const meta = VASE_METADATA[newSeq];
    const assets = grouped[origKey] || [];

    // Tìm ảnh 4_angles
    const angleAssets = assets.filter(a => a.public_id.includes('/4_angles/'));
    const frontAsset = angleAssets.find(a => a.public_id.endsWith('/front')) || assets[0];
    const backAsset = angleAssets.find(a => a.public_id.endsWith('/back'));
    const leftAsset = angleAssets.find(a => a.public_id.endsWith('/left'));
    const rightAsset = angleAssets.find(a => a.public_id.endsWith('/right'));

    // Các ảnh chi tiết khác (details/detail_1, etc.)
    const detailAssets = assets.filter(a => a.public_id.includes('/details/'));

    // Chuẩn bị danh sách ảnh variant:
    // Front là isPrimary: true, displayOrder: 0
    const variantImagesData = [];

    if (frontAsset) {
      variantImagesData.push({
        imageUrl: frontAsset.secure_url,
        isPrimary: true,
        displayOrder: 0
      });
    }

    let orderCounter = 1;
    [backAsset, leftAsset, rightAsset].forEach(a => {
      if (a) {
        variantImagesData.push({
          imageUrl: a.secure_url,
          isPrimary: false,
          displayOrder: orderCounter++
        });
      }
    });

    detailAssets.forEach(a => {
      variantImagesData.push({
        imageUrl: a.secure_url,
        isPrimary: false,
        displayOrder: orderCounter++
      });
    });

    const productName = `[${newSku}] ${meta.name}`;

    // Tạo Product, Variant và Images
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: productName,
        description: `${meta.desc} (Mã định danh gốc: ${origKey})`,
        isActive: true,
        isReturnable: false, // Theo đúng chỉ đạo của user: false hết
        variants: {
          create: {
            variantName: "Tiêu chuẩn - Dáng nguyên bản",
            price: meta.price,
            stockQuantity: meta.stock,
            images: {
              create: variantImagesData
            }
          }
        }
      },
      include: {
        variants: {
          include: {
            images: true
          }
        }
      }
    });

    createdProducts.push({
      newSku,
      origKey,
      name: product.name,
      price: meta.price,
      stock: meta.stock,
      imageCount: product.variants[0].images.length,
      coverUrl: product.variants[0].images.find(img => img.isPrimary)?.imageUrl
    });
  }

  console.log("=================================================================");
  console.log(`🎉 [6/6] ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG 21 BÌNH THẬT VÀO DATABASE!`);
  console.log("=================================================================");
  console.table(createdProducts.map(p => ({
    "Mã Mới": p.newSku,
    "Nguồn Cloudinary": p.origKey,
    "Tên Sản Phẩm": p.name.substring(0, 35) + "...",
    "Giá (VNĐ)": p.price.toLocaleString('vi-VN'),
    "Tồn": p.stock,
    "Số Ảnh": p.imageCount,
    "Ảnh Bìa (Front)": p.coverUrl ? "OK" : "Thiếu"
  })));
}

main()
  .catch(err => {
    console.error("❌ Lỗi trong quá trình đồng bộ:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

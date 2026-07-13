import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: "Thiếu API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
      Bạn là kế toán trưởng chuyên nghiệp. Hãy đọc hóa đơn, phiếu xuất hàng hải sản trong bức ảnh này và bóc tách dữ liệu.
      YÊU CẦU BẮT BUỘC:
      1. Bỏ qua header (tên cty, địa chỉ...). Chỉ lấy dữ liệu trong bảng danh sách hàng hóa.
      2. Nếu hóa đơn có các cột phức tạp như "Xuất bán", "Thực nhận", "Trả về" -> Chỉ lấy số lượng/trọng lượng chốt cuối cùng dùng để nhân với Đơn giá ra Thành tiền.
      3. Kết quả trả về PHẢI là một mảng JSON thuần túy (không bọc trong \`\`\`json ... \`\`\`), mỗi object đại diện 1 dòng hàng hóa, gồm các key sau (ghi đúng tên key):
         - "TenHang": (String) Tên hải sản (VD: Tôm alaska Chix, Cua King Vàng, Sò điệp...)
         - "SoLuong": (Number) Số lượng con/thùng (nếu không có để 0)
         - "TrongLuong": (Number) Khối lượng Kg thực tế tính tiền (nếu không có để 0)
         - "DonGia": (Number) Giá tiền một đơn vị
         - "ThanhTien": (Number) Tổng tiền của mặt hàng đó
      
      Kiểm tra chéo: (SoLuong hoặc TrongLuong) * DonGia phải bằng hoặc xấp xỉ ThanhTien. Nếu dòng nào là tổng cộng cuối bill thì bỏ qua không đưa vào mảng.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64.split(",")[1],
          mimeType: "image/jpeg",
        },
      },
    ]);

    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Lỗi:", error.message);
    return NextResponse.json({ success: false, error: "Không thể xử lý hóa đơn" }, { status: 500 });
  }
}
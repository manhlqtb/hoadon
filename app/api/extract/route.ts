import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: "Thiếu API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Chuẩn hóa gọi đích danh phiên bản Flash mới nhất
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Bạn là kế toán trưởng chuyên nghiệp. Hãy đọc hóa đơn hải sản này và bóc tách dữ liệu.
      YÊU CẦU BẮT BUỘC:
      1. Bỏ qua header. Chỉ lấy dữ liệu bảng danh sách hàng hóa.
      2. Nếu có các cột phức tạp như "Xuất bán", "Thực nhận", "Trả về" -> Chỉ lấy số lượng/trọng lượng chốt cuối cùng dùng để tính tiền.
      3. Kết quả PHẢI là một mảng JSON thuần túy (không bọc trong \`\`\`json ... \`\`\`), mỗi object gồm:
         - "TenHang": (String) Tên hải sản
         - "SoLuong": (Number)
         - "TrongLuong": (Number)
         - "DonGia": (Number)
         - "ThanhTien": (Number)
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
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Thiếu API Key trong Vercel" }, { status: 500 });
    }

    const prompt = `Bạn là kế toán trưởng chuyên nghiệp. Hãy đọc hóa đơn hải sản này và bóc tách dữ liệu.
      YÊU CẦU BẮT BUỘC:
      1. Bỏ qua header. Chỉ lấy dữ liệu bảng danh sách hàng hóa.
      2. Nếu có các cột phức tạp như "Xuất bán", "Thực nhận", "Trả về" -> Chỉ lấy số lượng/trọng lượng chốt cuối cùng dùng để tính tiền.
      3. Kết quả PHẢI là một mảng JSON thuần túy (không bọc trong \`\`\`json ... \`\`\`), mỗi object gồm:
         - "TenHang": (String) Tên hải sản
         - "SoLuong": (Number)
         - "TrongLuong": (Number)
         - "DonGia": (Number)
         - "ThanhTien": (Number)`;

    // Xử lý chuỗi Base64
    const base64Data = imageBase64.split(",")[1];

    // Bắn thẳng API gốc của Google, dùng model 1.5 Flash chuẩn nhất hiện tại
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    // Bắt lỗi nếu API key của anh có vấn đề thực sự (Hết hạn/Bị khóa)
    if (!response.ok) {
      console.error("Chi tiết lỗi từ Google:", data);
      return NextResponse.json({ success: false, error: data.error?.message || "Lỗi kết nối Google API" }, { status: 500 });
    }

    // Lọc và trả kết quả Excel
    const responseText = data.candidates[0].content.parts[0].text;
    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const resultJson = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: resultJson });

  } catch (error: any) {
    console.error("Lỗi hệ thống nội bộ:", error.message);
    return NextResponse.json({ success: false, error: "Lỗi hệ thống hoặc định dạng trả về" }, { status: 500 });
  }
}
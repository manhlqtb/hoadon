import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    
    // Lấy chìa khóa OpenAI từ Vercel
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Thiếu OPENAI_API_KEY trong Vercel" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: apiKey });

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

    // Bắn dữ liệu sang máy chủ OpenAI (dùng model gpt-4o mạnh nhất)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageBase64, // Dùng thẳng chuỗi base64 có sẵn
              },
            },
          ],
        },
      ],
    });

    const responseText = response.choices[0].message.content || "[]";
    
    // Dọn dẹp dữ liệu rác nếu AI trả về dư thừa
    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const resultJson = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: resultJson });

  } catch (error: any) {
    console.error("Lỗi từ OpenAI:", error.message);
    return NextResponse.json({ success: false, error: "Không thể xử lý hóa đơn. Vui lòng kiểm tra lại ảnh hoặc API Key." }, { status: 500 });
  }
}
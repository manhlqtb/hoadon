import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Lấy hình ảnh từ request (input có name="file")
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Không có file ảnh' });
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Tạo form gửi lên OCR.space
  const ocrForm = new FormData();
  ocrForm.append('file', buffer, file.name);       // file ảnh
  ocrForm.append('isTable', 'true');               // bật nhận dạng bảng
  ocrForm.append('OCREngine', '3');                // engine 3 (bảng + nhận dạng chính xác)
  ocrForm.append('language', 'vie');               // ngôn ngữ (tiếng Việt)
  ocrForm.append('apikey', process.env.OCR_SPACE_API_KEY || '');

  // Gọi API OCR.space
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: ocrForm
  });
  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    // Xử lý lỗi nếu có
    return NextResponse.json({ error: data.ErrorMessage });
  }

  // Ví dụ: lấy text thô kết quả
  const parsedText = data.ParsedResults[0].ParsedText as string;
  // TODO: Tách parsedText thành các trường Tên hàng, Số lượng, ... theo cột
  // Dưới đây chỉ trả full text (bạn có thể xử lý thêm ở client)
  return NextResponse.json({ text: parsedText, raw: data });
}

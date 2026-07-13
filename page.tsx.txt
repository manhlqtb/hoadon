"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type InvoiceItem = {
  TenHang: string;
  SoLuong: number;
  TrongLuong: number;
  DonGia: number;
  ThanhTien: number;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      
      if (data.success) {
        setItems(data.data);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (items.length === 0) return alert("Không có dữ liệu để xuất");

    const totalAmount = items.reduce((sum, item) => sum + Number(item.ThanhTien), 0);
    
    const excelData = [
      ...items,
      { TenHang: "TỔNG CỘNG", SoLuong: "", TrongLuong: "", DonGia: "", ThanhTien: totalAmount }
    ];

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Đặt tên cột tiếng Việt cho đẹp
    XLSX.utils.sheet_add_aoa(worksheet, [["Tên Hàng Hóa", "Số Lượng (Con/Thùng)", "Trọng Lượng (Kg)", "Đơn Giá", "Thành Tiền"]], { origin: "A1" });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangKeHoaDon");
    
    XLSX.writeFile(workbook, `NhapHang_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hệ Thống Số Hóa Hóa Đơn</h1>
            <p className="text-gray-500 text-sm mt-1">Upload ảnh hóa đơn để AI tự động bóc tách thành Excel</p>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload}
            className="block w-full md:w-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        {loading && (
          <div className="text-center py-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-medium animate-pulse">
            Đang phân tích dữ liệu ảnh, vui lòng chờ trong giây lát...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {imagePreview && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h2 className="font-semibold text-gray-700 mb-3 border-b pb-2">Ảnh Gốc</h2>
              <img src={imagePreview} alt="Invoice" className="w-full h-auto object-contain max-h-[70vh] rounded" />
            </div>
          )}

          {items.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3 border-b pb-2">
                <h2 className="font-semibold text-green-700">Dữ Liệu Bóc Tách</h2>
                <button 
                  onClick={handleExportExcel}
                  className="bg-green-600 text-white px-4 py-1.5 text-sm rounded shadow hover:bg-green-700 transition font-medium"
                >
                  Tải file Excel
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse min-w-[500px]">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="p-2 border">Tên hàng</th>
                      <th className="p-2 border text-right">SL</th>
                      <th className="p-2 border text-right">Kg</th>
                      <th className="p-2 border text-right">Đơn giá</th>
                      <th className="p-2 border text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 border-b last:border-0">
                        <td className="p-2 border font-medium text-gray-800">{item.TenHang}</td>
                        <td className="p-2 border text-right">{item.SoLuong || "-"}</td>
                        <td className="p-2 border text-right">{item.TrongLuong || "-"}</td>
                        <td className="p-2 border text-right text-gray-600">{item.DonGia?.toLocaleString('vi-VN')}</td>
                        <td className="p-2 border text-right font-semibold text-red-600">
                          {item.ThanhTien?.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
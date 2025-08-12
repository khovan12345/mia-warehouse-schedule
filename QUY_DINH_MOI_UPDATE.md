# 📋 Cập nhật Quy định Lịch Làm Việc - MIA Warehouse

## 🎯 Quy định mới đã áp dụng

### 1. **Ngày nghỉ**
- ✅ Mỗi nhân viên nghỉ **1 ngày/tuần** (không phải nghỉ phép)
- ✅ 1 ngày phép/tháng theo luật lao động → **cộng dồn vào lương**
- ✅ Hạn chế nghỉ ngày peak

### 2. **Giờ công & Tăng ca**
- ✅ Chuẩn: **208h/tháng**
- ✅ Tăng ca: **x1.5** (giờ thứ 209 trở đi)
- ✅ Chủ nhật: Tính giờ **thường** (x1.0, không x1.5)
- ✅ Ngày lễ: **x2.0**

### 3. **Ca làm việc**
- ✅ Mỗi ca: **8h làm + 1h nghỉ = 9h**
- ✅ Nghỉ trưa: 12h-13h
- ✅ Nghỉ chiều: 16h-17h

### 4. **Ngày Peak (cần 3 nhân viên)**
- ✅ Ngày đôi: **8/8, 9/9, 10/10, 11/11, 12/12**
- ✅ Sale giữa tháng: **ngày 15**
- ✅ Sale cuối tháng: **ngày 25**
- ✅ Tự động gọi người nghỉ đi làm nếu thiếu

### 5. **Chủ nhật**
- ✅ 2 người làm (có thể điều chỉnh theo khối lượng)
- ✅ Giờ công tính **thường** (không tăng ca)

## 📊 Ví dụ tháng 31 ngày

```
Tổng ngày: 31
Số tuần: 5 (làm tròn)
Ngày nghỉ/người: 5 ngày
Ngày làm/người: 26 ngày
Giờ công: 26 x 8h = 208h ✅
```

## 🔧 Thuật toán đã cập nhật

1. **Phân ngày nghỉ**:
   - 1 ngày/tuần cho mỗi người
   - Tránh nghỉ ngày peak (phạt -50 điểm)
   - Ưu tiên nghỉ ngày thường

2. **Phân ca làm việc**:
   - Peak: 3 người (morning, afternoon, midday)
   - Thường: 2 người
   - CN: 2 người

3. **Xử lý ngày peak thiếu người**:
   - Tự động hủy ngày nghỉ
   - Gọi người nghỉ đi làm
   - Log cảnh báo trong console

## 📱 Deploy Status

✅ Code đã push lên GitHub
🔄 Vercel đang auto-deploy
⏱️ Thời gian: ~1-2 phút

URL: https://mia-warehouse-schedule-uaue.vercel.app/

## 🧪 Cách kiểm tra

1. Tạo lịch mới
2. Mở Console (F12)
3. Kiểm tra:
   - Log ngày nghỉ mỗi người
   - Log ngày peak thiếu người
   - Tổng giờ công cuối tháng

---
*Updated: ${new Date().toLocaleString('vi-VN')}*

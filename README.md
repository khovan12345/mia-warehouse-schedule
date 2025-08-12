# 📅 Hệ thống Quản lý Lịch Làm việc Kho Vận - MIA.VN

Phiên bản 2.0 - Nâng cấp toàn diện với nhiều tính năng mới và hiệu năng tối ưu.

## 🌟 Tính năng chính

### 📊 Quản lý Ca làm việc

- Tạo lịch tự động thông minh dựa trên thuật toán tối ưu
- Quản lý 3-5 nhân viên với ca xoay linh hoạt
- Tính toán giờ công, tăng ca, ngày lễ tự động
- Phân bổ ca làm việc công bằng giữa nhân viên

### 💾 Lưu trữ & Xuất dữ liệu

- **LocalStorage**: Tự động lưu lịch, không mất dữ liệu khi reload
- **Export Excel/CSV**: Xuất báo cáo chi tiết
- **Import/Export JSON**: Sao lưu và khôi phục dữ liệu
- **Print**: In lịch với layout tối ưu

### 🎨 Giao diện & Trải nghiệm

- **Dark Mode**: Chế độ tối bảo vệ mắt
- **Responsive**: Hoạt động mượt mà trên mọi thiết bị
- **PWA**: Cài đặt như ứng dụng, hoạt động offline
- **Animations**: Hiệu ứng mượt mà, chuyên nghiệp

### 📈 Phân tích & Thống kê

- Biểu đồ trực quan với Chart.js
- Phân tích nhân sự tự động
- Đề xuất tối ưu hóa ca làm việc
- Cảnh báo vi phạm quy định lao động

## 🚀 Cài đặt & Chạy

### Yêu cầu

- Node.js 16+
- npm hoặc yarn

### Cài đặt local

```bash
# Clone repository
git clone [your-repo-url]
cd Schedule

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build
```

## 🌐 Deploy lên Vercel

### Cách 1: Deploy qua Vercel CLI

```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Login Vercel
vercel login

# Deploy
vercel --prod
```

### Cách 2: Deploy qua GitHub

1. Push code lên GitHub repository
2. Truy cập [vercel.com](https://vercel.com)
3. Import Git Repository
4. Chọn repository và nhấn Deploy
5. Vercel sẽ tự động build và deploy

### Cấu hình Domain tùy chỉnh

1. Vào Project Settings trên Vercel
2. Chọn Domains
3. Thêm domain của bạn
4. Cấu hình DNS theo hướng dẫn

## 📁 Cấu trúc dự án

```
Schedule/
├── src/
│   ├── css/
│   │   ├── main.css        # Styles chính
│   │   ├── dark-mode.css   # Dark mode styles
│   │   └── print.css       # Print styles
│   ├── js/
│   │   ├── app.js          # Main application
│   │   ├── schedule.js     # Logic lịch làm việc
│   │   ├── storage.js      # LocalStorage handler
│   │   ├── export.js       # Export functions
│   │   ├── charts.js       # Chart.js integration
│   │   └── utils.js        # Utility functions
│   └── assets/
│       ├── icons/          # App icons
│       └── images/         # Images
├── public/
│   ├── manifest.json       # PWA manifest
│   └── service-worker.js   # Service worker
├── index.html              # Main HTML
├── package.json
├── vercel.json            # Vercel config
├── vite.config.js         # Vite config
└── README.md
```

## 🔧 Cấu hình

### Environment Variables (Optional)

Tạo file `.env.local`:

```env
VITE_APP_TITLE=MIA.VN Schedule System
VITE_API_URL=https://api.example.com
```

### Tùy chỉnh

- **Số nhân viên**: Điều chỉnh trong `src/js/config.js`
- **Giờ làm việc**: Cấu hình ca trong `CONFIG.shifts`
- **Ngày Peak**: Tùy chỉnh trong `CONFIG.peakDays`

## 🛠️ Development

### Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy lên Vercel

### Code Style

Project sử dụng:

- ES6+ JavaScript
- CSS3 với CSS Variables
- Semantic HTML5

## 📱 PWA Features

App hỗ trợ đầy đủ PWA:

- ✅ Installable
- ✅ Offline capable
- ✅ Push notifications ready
- ✅ Auto update

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👥 Team

Developed with ❤️ by MIA.VN Team

---

**Note**: Đây là phiên bản 2.0 với nhiều cải tiến về hiệu năng và tính năng. Nếu cần hỗ trợ, vui lòng tạo issue trên GitHub.

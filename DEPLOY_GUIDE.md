# 🚀 Hướng dẫn Deploy lên Vercel

## 📋 Chuẩn bị

### 1. Cài đặt Git (nếu chưa có)

```bash
# MacOS
brew install git

# Windows
# Download từ https://git-scm.com/download/win

# Linux
sudo apt-get install git
```

### 2. Tạo tài khoản GitHub

- Truy cập [github.com](https://github.com)
- Đăng ký tài khoản miễn phí

### 3. Tạo tài khoản Vercel

- Truy cập [vercel.com](https://vercel.com)
- Đăng nhập bằng GitHub

## 🔧 Bước 1: Khởi tạo Git Repository

```bash
# Di chuyển vào thư mục dự án
cd "/Users/phuccao/Desktop/Công việc/Schedule"

# Khởi tạo git
git init

# Thêm tất cả files
git add .

# Commit đầu tiên
git commit -m "Initial commit: MIA.VN Warehouse Schedule System v2.0"
```

## 📤 Bước 2: Push lên GitHub

### Tạo repository mới trên GitHub:

1. Đăng nhập GitHub
2. Click nút "+" > "New repository"
3. Đặt tên: `mia-warehouse-schedule`
4. Chọn "Private" hoặc "Public"
5. KHÔNG chọn "Initialize with README"
6. Click "Create repository"

### Push code lên GitHub:

```bash
# Thêm remote origin (thay YOUR_USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/mia-warehouse-schedule.git

# Push lên GitHub
git branch -M main
git push -u origin main
```

## 🌐 Bước 3: Deploy với Vercel

### Cách 1: Deploy qua Vercel Dashboard

1. Đăng nhập [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import Git Repository
4. Chọn repository `mia-warehouse-schedule`
5. Cấu hình:
   - Framework Preset: `Vite`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click "Deploy"
7. Đợi 1-2 phút để deploy hoàn tất

### Cách 2: Deploy qua Vercel CLI

```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Trả lời các câu hỏi:
# - Set up and deploy? Y
# - Which scope? Chọn account của bạn
# - Link to existing project? N
# - Project name? mia-warehouse-schedule
# - Directory? ./
# - Override settings? N

# Deploy production
vercel --prod
```

## 🔗 Bước 4: Cấu hình Domain (Tùy chọn)

### Sử dụng subdomain Vercel:

- URL mặc định: `https://mia-warehouse-schedule.vercel.app`

### Sử dụng domain riêng:

1. Vào Project Settings > Domains
2. Add domain: `schedule.mia.vn`
3. Cấu hình DNS:
   ```
   Type: CNAME
   Name: schedule
   Value: cname.vercel-dns.com
   ```

## 📱 Bước 5: Cài đặt PWA

Sau khi deploy, truy cập website trên:

- **Desktop**: Chrome/Edge > Menu > Install App
- **Mobile**: Safari/Chrome > Share > Add to Home Screen

## 🔄 Cập nhật Code

Khi cần update:

```bash
# Thực hiện thay đổi
# ...

# Commit changes
git add .
git commit -m "Update: description of changes"

# Push to GitHub
git push

# Vercel sẽ tự động deploy!
```

## 🛠️ Troubleshooting

### Lỗi build:

```bash
# Cài lại dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Lỗi permission:

```bash
# Set quyền cho files
chmod -R 755 .
```

### Cache issues:

- Vercel Dashboard > Settings > Functions > Clear Cache

## 📊 Monitoring

### Xem logs:

- Vercel Dashboard > Functions > Logs

### Analytics:

- Vercel Dashboard > Analytics

## 🔐 Environment Variables (Nếu cần)

1. Vercel Dashboard > Settings > Environment Variables
2. Thêm biến:
   - `VITE_API_URL`: URL API backend
   - `VITE_APP_TITLE`: Tiêu đề app

## 📝 Checklist Deploy

- [ ] Code đã test local: `npm run build && npm run preview`
- [ ] Đã commit tất cả changes
- [ ] Đã push lên GitHub
- [ ] Vercel đã kết nối với GitHub repo
- [ ] Build thành công trên Vercel
- [ ] Website hoạt động tốt
- [ ] PWA cài đặt được
- [ ] Dark mode hoạt động
- [ ] LocalStorage lưu data
- [ ] Export/Import hoạt động

## 🎉 Hoàn thành!

Website của bạn đã online tại:

- Vercel URL: `https://[project-name].vercel.app`
- Custom domain: `https://schedule.mia.vn` (nếu đã cấu hình)

### Links hữu ích:

- [Vercel Docs](https://vercel.com/docs)
- [Vite Docs](https://vitejs.dev)
- [PWA Guide](https://web.dev/progressive-web-apps/)

---

**Lưu ý**: File backup của hệ thống cũ được lưu tại `warehouse-schedule-optimized.backup.html`

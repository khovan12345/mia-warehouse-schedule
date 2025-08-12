# 🚀 Hướng dẫn Deploy lên Vercel - Chi tiết

## Bước 1: Đăng nhập Vercel

1. Truy cập: **https://vercel.com**
2. Click **"Sign Up"** (nếu chưa có tài khoản)
3. Chọn **"Continue with GitHub"**
4. Authorize Vercel truy cập GitHub

## Bước 2: Import Project

1. Sau khi đăng nhập, click **"Add New..."** → **"Project"**
2. Hoặc truy cập trực tiếp: **https://vercel.com/new**

## Bước 3: Chọn Repository

1. Trong phần **"Import Git Repository"**
2. Tìm **"khovan12345/mia-warehouse-schedule"**
3. Click nút **"Import"**

## Bước 4: Cấu hình Build

Vercel sẽ tự động nhận diện Vite. Kiểm tra các settings:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Không cần thay đổi gì!** Vercel đã tự động cấu hình đúng.

## Bước 5: Deploy

1. Click nút **"Deploy"** (màu xanh lớn)
2. Đợi 1-2 phút để Vercel build và deploy

## Bước 6: Hoàn tất!

Sau khi deploy xong, bạn sẽ nhận được:
- **Production URL**: https://mia-warehouse-schedule.vercel.app
- **Preview URL**: Cho mỗi commit mới

## 🔧 Troubleshooting

### Lỗi "Project not found":
- Kiểm tra đã authorize Vercel chưa
- Refresh lại trang và thử lại

### Lỗi build:
```bash
# Local test trước khi deploy
npm run build
npm run preview
```

### Lỗi 404:
- Kiểm tra file `vercel.json` đã đúng chưa
- Clear cache: Settings → Functions → Clear Cache

## 🎯 Tips

1. **Custom Domain**: Settings → Domains → Add Domain
2. **Environment Variables**: Settings → Environment Variables
3. **Analytics**: Tự động có Analytics miễn phí
4. **Logs**: Functions → View Logs

## 📱 Test PWA sau Deploy

1. Mở URL production trên mobile
2. Chrome/Safari sẽ hiện "Add to Home Screen"
3. Cài và test offline mode!

---

Nếu gặp lỗi, hãy gửi screenshot để được hỗ trợ!

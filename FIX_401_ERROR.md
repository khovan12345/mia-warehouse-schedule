# 🔧 Sửa lỗi HTTP 401 trên Vercel

## Nguyên nhân
Project đang bị bảo vệ bằng mật khẩu hoặc chỉ cho phép team members truy cập.

## Cách sửa

### Option 1: Từ Vercel Dashboard

1. Đăng nhập Vercel: https://vercel.com
2. Vào project: `mia-schedule`
3. Click **Settings** (góc trên phải)

#### Tắt Password Protection:
- Settings → General → Password Protection → **Toggle OFF**

#### Tắt Deployment Protection:
- Settings → Security → Deployment Protection
- Chọn **"Public"** thay vì **"Only Team Members"**

### Option 2: Tạo project mới (nếu không có quyền admin)

```bash
# Delete current link
rm -rf .vercel

# Create new project với tên khác
npx vercel --yes --name mia-warehouse-public

# Deploy production
npx vercel --prod
```

### Option 3: Sử dụng Vercel CLI

```bash
# Login lại Vercel
npx vercel login

# List teams
npx vercel teams list

# Switch to personal account
npx vercel switch
```

## Test sau khi sửa

```bash
# Test URL
curl -I https://your-vercel-url.vercel.app

# Should return HTTP 200 OK
```

## Alternative: Deploy với account khác

Nếu không sửa được, có thể:
1. Logout: `npx vercel logout`
2. Login với email khác: `npx vercel login`
3. Deploy lại từ đầu

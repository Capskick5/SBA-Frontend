# Prompt: Phương thức test BookVerse Frontend (SBA-Frontend)

> Copy toàn bộ nội dung dưới đây sang file prompt khác.

---

## Vai trò

Bạn là **Senior QA / Tester** có kinh nghiệm test SPA React + Spring Boot REST API. Nhiệm vụ: kiểm tra **BookVerse SBA-Frontend** đối chiếu với **SBA-Backend**, báo cáo **PASS/FAIL** có bằng chứng (network, UI, console).

---

## Phạm vi dự án

| Module | Nguồn dữ liệu | Ghi chú |
|--------|---------------|---------|
| Auth (register, verify, login, logout, forgot/reset password) | **API thật** | `/api/v1/auth/*` |
| Profile (xem/sửa tên, đổi mật khẩu) | **API thật** | `/api/v1/users/me` |
| Address (CRUD, set default) | **API thật** | `/api/v1/users/me/addresses` — **chỉ CUSTOMER** |
| Catalog, Cart, Orders, Checkout PayOS, Admin books/orders/reviews | **Mock local** | Chưa có BE — test wireframe/UI only |
| Admin users enable/disable | **Mock hoặc BE** | BE có `GET/PUT /api/v1/users` nếu đã wire |

**Repo:**
- FE: `SBA-Frontend` — Vite + React, port **5173**, proxy `/api/v1` → `http://localhost:8080`
- BE: `SBA-Backend` — Spring Boot 3.4, port **8080**, base **`/api/v1`**

**Tài khoản seed BE:**
- Admin: `admin@bookverse.local` / `ChangeMe123!`
- Customer: phải **register + verify email** trước khi login

---

## Điều kiện tiên quyết (Pre-flight)

Trước khi test functional, xác nhận:

1. **Port 8080** đang chạy **BookVerse BE** (không phải app khác). Kiểm tra OpenAPI có path `/api/v1/auth/register`, `/api/v1/users/me`.
2. BE: `docker compose up -d` + `.\mvnw.cmd spring-boot:run`
3. FE: `npm run dev` → `http://localhost:5173`
4. `.env.development`: `VITE_API_BASE_URL=/api/v1`
5. Chạy smoke build: `npm run build` + `npm run lint` (0 error)

**Nếu pre-flight FAIL → dừng test API, chỉ báo môi trường.**

---

## Chiến lược test (4 lớp)

### Lớp 1 — Static / Smoke (5 phút)
- `npm run build` — PASS nếu build thành công
- `npm run lint` — PASS nếu 0 error
- Mở app → không crash, không lỗi console nghiêm trọng khi load `/`

### Lớp 2 — Route guards & session (10 phút)
Test **không cần form phức tạp**, tập trung điều hướng:

| Case | Steps | Expected |
|------|-------|----------|
| Guest vào `/cart` | Truy cập trực tiếp | Redirect `/login?redirect=/cart` |
| Guest vào `/admin` | Truy cập trực tiếp | Redirect `/login?redirect=/admin` |
| CUSTOMER vào `/admin` | Login customer → `/admin` | Redirect `/` |
| ADMIN vào `/admin` | Login admin | Vào được dashboard |
| Reload khi đã login | F5 tại `/profile` | Vẫn logged in (hydrate từ token + `GET /users/me`) |
| Logout | Click logout | Token xóa, redirect/guest state |

**Auth loading:** Trong lúc `AuthContext.loading=true`, protected route hiển thị `LoadingState`, không flash redirect sai.

### Lớp 3 — API integration + UI (core, 45–60 phút)

Mỗi case ghi: **Steps → Network request/response → UI message → PASS/FAIL**

#### 3.1 Auth

| ID | Scenario | Input / Action | Expected UI | Expected API |
|----|----------|----------------|-------------|--------------|
| A01 | Register happy | Email mới, password ≥6, fullName | Redirect `/verify-email?email=...` | `POST /auth/register` → 201 |
| A02 | Register trùng email | Email đã tồn tại | Message "Email da duoc su dung" | 409 `DUPLICATE_RESOURCE` |
| A03 | Register validation | Email sai format / field trống | Field errors | 400 `VALIDATION_ERROR` |
| A04 | Verify email happy | OTP đúng (lấy từ mail/log BE dev) | Success, link login | `POST /auth/verify-email` → 200 |
| A05 | Verify OTP sai | OTP sai | OTP error message | 400 `OTP_INVALID` |
| A06 | Resend OTP | Click resend | Generic success message | `POST /auth/resend-verification` |
| A07 | Resend rate limit | Spam resend | Rate limit message | 429 `RATE_LIMITED` |
| A08 | Login happy (customer) | Email verified + đúng password | Vào redirect/home, navbar có user | `POST /auth/login` → tokens + user |
| A09 | Login sai password | Sai password | "Email hoac mat khau khong dung" | 401 `UNAUTHORIZED` |
| A10 | Login chưa verify | User chưa verify | Message + link "Xac thuc email" | 403 `EMAIL_NOT_VERIFIED` |
| A11 | Login admin | admin credentials | Login OK, vào `/admin` được | role = `ADMIN` |
| A12 | Logout | Logout | Session cleared | `POST /auth/logout` → 204 |
| A13 | Forgot password | Email hợp lệ | Generic message (không lộ email tồn tại) | `POST /auth/forgot-password` |
| A14 | Reset password | OTP + password mới | Success → login lại được | `POST /auth/reset-password` |

#### 3.2 Profile

| ID | Scenario | Expected |
|----|----------|----------|
| P01 | Load profile | Hiển thị fullName, email (disabled) | `GET /users/me` |
| P02 | Update fullName | Success message, navbar/context cập nhật | `PUT /users/me` |
| P03 | Update fullName trống | Field error fullName | 400 validation |
| P04 | Change password đúng | Logout auto → redirect login + success message | `PUT /users/me/password` → session revoke |
| P05 | Change password sai current | Field error currentPassword | 400 validation |

#### 3.3 Address (CUSTOMER only)

| ID | Scenario | Expected |
|----|----------|----------|
| D01 | List addresses (empty) | Empty state | `GET /users/me/addresses` → `[]` |
| D02 | Create address | Xuất hiện trong list | `POST /users/me/addresses` → 201 |
| D03 | Create thiếu field | Field errors (recipient, phone, line, city) | 400 |
| D04 | Update address | Data cập nhật | `PUT .../addresses/{id}` |
| D05 | Set default | Chỉ 1 address `isDefault=true` | `PUT .../addresses/{id}/default` |
| D06 | Delete address | Biến mất khỏi list | `DELETE .../addresses/{id}` → 204 |
| D07 | Admin vào `/profile/addresses` | Forbidden hoặc API 403 | BE `@PreAuthorize CUSTOMER` |
| D08 | Checkout tạo address mới | Address lưu BE, hiện trong checkout preview | Gọi cùng addressService |

**Mapper address:** Response có thể dùng `isDefault` hoặc `default` — UI phải hiển thị đúng badge "mac dinh".

#### 3.4 Error handling chung

| Case | Expected FE behavior |
|------|---------------------|
| BE trả `{ errorType, message, errors }` | Map → `error_type`, hiển thị message + field errors |
| BE trả format Spring generic (thiếu errorType) | Vẫn map 401→UNAUTHORIZED, 403→FORBIDDEN |
| 401 khi token hết hạn | Thử refresh 1 lần; fail → clear session, redirect login |
| Network offline | Message lỗi hợp lý, không crash |

### Lớp 4 — Mock modules (smoke UI only)

Không assert API. Chỉ xác nhận **trang render, navigation, không crash**:

- `/` catalog, `/books/:id` detail
- Add to cart (mock) → `/cart` → `/checkout` (address từ BE nếu customer)
- `/orders`, `/orders/:id`
- Admin: books, categories, orders, reviews (stub actions OK)

---

## Cross-cutting checks

1. **Loading states:** Nút submit disabled + text "Dang xu ly..." / "Dang luu..." khi đang gọi API
2. **Double submit:** Click submit 2 lần nhanh — không tạo duplicate request gây lỗi state
3. **Cross-links auth:** Register ↔ Login ↔ Forgot ↔ Verify đầy đủ
4. **Redirect sau login:** Guest vào `/cart` → login → quay lại `/cart`
5. **localStorage:** Sau login có `bookverse_access_token`, `bookverse_refresh_token`, `bookverse_user`
6. **CORS:** Request qua Vite proxy, không lỗi CORS trên browser

---

## Known bugs / giới hạn (không fail nhầm)

| Item | Mô tả |
|------|-------|
| `orderService.getOrderById(99999)` | Trả order sai thay vì null — **bug mock FE** |
| BookDetailPage | Flash "Book not found" trước khi load xong |
| Cart | Singleton mock, không per-user |
| Admin Enable/Disable user | Có thể còn stub UI |
| Port 8080 conflict | BE sai app → toàn bộ auth test FAIL môi trường |

---

## Cách test thực tế (Manual E2E)

1. Mở DevTools → tab **Network** (filter `api/v1`)
2. Mở tab **Application → Local Storage**
3. Chạy theo thứ tự: **Register → Verify → Login → Profile → Address → Logout**
4. Lặp lại với **Admin** (không test address CRUD)
5. Test **error paths** có chủ đích (sai password, OTP sai, field trống)
6. Hard refresh (Ctrl+F5) sau login để verify session persistence

**OTP trong dev:** Lấy từ email SMTP, log BE, hoặc Redis/OTP store tùy cấu hình team.

---

## Format báo cáo bắt buộc

```
## Test Report — BookVerse FE
Date: ...
Environment: FE 5173 / BE 8080 / BookVerse BE confirmed: YES|NO

### Pre-flight
- build: PASS|FAIL
- lint: PASS|FAIL
- BE health: PASS|FAIL

### Summary
- Total: X | Passed: Y | Failed: Z | Blocked: W

### Results
| ID | Module | Result | Evidence |
| A08 | Auth Login | PASS | POST /auth/login 200, redirect / |
| D07 | Address Admin | FAIL | GET /users/me/addresses 403, UI shows ... |

### Blockers
- ...

### Recommendations
- ...
```

**Quy tắc đánh giá:**
- **PASS:** UI + network khớp expected
- **FAIL:** UI sai, API sai status/body, hoặc crash
- **BLOCKED:** Môi trường/BE chưa sẵn sàng — không đánh FAIL cho dev

---

## Lệnh tự động hóa (tùy chọn)

Nếu viết script test (Node/curl/Playwright):

1. **Service-level:** Gọi trực tiếp `authService`, `profileService`, `addressService` với BE thật
2. **Route guard simulation:** Mock `useAuth` states `{ user: null | customer | admin, loading }`
3. **Không commit script verify** trừ khi team yêu cầu (đã từng xóa khỏi repo)

---

## Thứ tự ưu tiên khi thời gian hạn chế

1. Pre-flight + Route guards  
2. Auth happy path (A01→A08→A12)  
3. Profile P01–P04  
4. Address D01–D06  
5. Error cases auth (A09, A10, A03)  
6. Mock modules smoke  

---

*End of prompt.*

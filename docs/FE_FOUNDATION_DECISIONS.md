# BookVerse FE Foundation Decisions

Muc tieu cua file nay la giup team FE thong nhat khung truoc khi code. Ban dau lam day du luong, trang den don gian, chua can dep. Sau khi flow chay on, team moi nang cap style.

## 1. Huong di da chot

FE se lam full scope theo docs BookVerse, nhung ban dau la wireframe functional:

- Day du man hinh va luong nghiep vu.
- Mau sac trang/den/xam, bo cuc ro rang.
- Chua can animation, gradient, hero lon, polish visual.
- Uu tien dung flow, dung data shape, dung component chung.
- Sau nay style co the nang cap neu team giu component va layout sach.

Trong scope:

- Auth: register, verify email, login, forgot/reset password.
- User/profile/address.
- Category/book catalog.
- Book detail.
- Cart.
- Checkout information truoc payment.
- Payment result.
- Order list/detail/status history.
- Review.
- Admin: statistics, categories, books, stock, orders, users, reviews.

Ngoai scope:

- Voucher.
- Loyalty.
- Wishlist.
- Refund/return.
- Recommendation.
- Realtime support chat.

## 2. Quyet dinh da chot

- Chua login bam `Add to Cart` thi chuyen sang `/login`.
- Login xong nen quay lai trang truoc do neu co `redirect`.
- Checkout cho chon address co san va them address moi ngay trong man checkout.
- Admin review moderation co man rieng don gian `/admin/reviews`.
- Payment result ho tro mock trang thai bang query param:
  - `/payment/result?status=success`
  - `/payment/result?status=failed`
  - `/payment/result?status=cancelled`
  - `/payment/result?status=pending`

## 3. Customer flow chot

```text
Home/Catalog
-> Book Detail
-> Add to Cart
-> Neu chua login: /login
-> Login xong quay lai trang truoc
-> Add to Cart
-> Cart
-> Checkout Information
-> Payment
-> Payment Result
-> Order Detail
-> Review khi order DELIVERED
```

Auth flow:

```text
Register
-> Verify Email
-> Login
```

Forgot password flow:

```text
Forgot Password
-> Nhap email
-> Nhap OTP + password moi
-> Login
```

## 4. Route map chot

Public:

- `/` - Catalog/Home.
- `/books/:id` - Book detail.
- `/login`.
- `/register`.
- `/verify-email`.
- `/forgot-password`.
- `/reset-password`.

Customer, can login:

- `/cart`.
- `/checkout`.
- `/payment/result`.
- `/orders`.
- `/orders/:id`.
- `/profile`.
- `/profile/addresses`.

Admin, can role admin:

- `/admin`.
- `/admin/categories`.
- `/admin/books`.
- `/admin/books/:id`.
- `/admin/orders`.
- `/admin/orders/:id`.
- `/admin/users`.
- `/admin/reviews`.

## 5. Screen can co

Customer:

- Catalog: search, filter category, sort, pagination don gian.
- Book Detail: cover, title, author, description, price, stock, add to cart, reviews.
- Cart: item list, quantity, remove, subtotal, checkout button.
- Checkout: address selector, address form, item summary, shipping fee, total, payment button.
- Payment Result: trang thai thanh toan, order link, back home.
- Orders: danh sach don.
- Order Detail: item snapshot, address snapshot, payment status, order timeline.
- Profile: full name, email, change password.
- Address Management: list/add/edit/delete/set default.
- Review: list review, create review neu du dieu kien.

Admin:

- Dashboard/statistics.
- Category management.
- Book management.
- Book create/edit.
- Stock adjustment, gop trong book detail/edit.
- Order management.
- Order detail/status update.
- User management enable/disable.
- Review moderation.

## 6. Data shape chot

Book detail:

```js
{
  id,
  title,
  author,
  description,
  price,
  coverUrl,
  stock
}
```

BookCard:

```js
{
  id,
  title,
  author,
  price,
  coverUrl,
  stock
}
```

Cart item:

```js
{
  itemId,
  bookId,
  title,
  coverUrl,
  price,
  quantity,
  lineTotal
}
```

Checkout preview:

```js
{
  items,
  subtotal,
  shippingFee,
  total,
  address
}
```

Order detail:

```js
{
  id,
  status,
  paymentStatus,
  items,
  addressSnapshot,
  subtotal,
  shippingFee,
  total,
  statusHistory
}
```

## 7. Component structure

Component duoc chia theo 3 cap:

1. Layout component: khung trang.
2. Domain component: component gan voi nghiep vu BookVerse.
3. Shared UI component: nut, input, modal, table dung lai nhieu noi.

### Navbar

Navbar gom:

- Logo ben trai.
- Search bar.
- Cart icon.
- Orders link khi da login.
- Profile menu khi da login.
- Login/Register khi chua login.
- Admin link neu role admin.
- Mobile menu.

Desktop structure:

- Logo.
- Search.
- Cart.
- Orders.
- Profile/Login.
- Admin link neu user co role admin.

Mobile structure:

- Logo.
- Cart.
- Hamburger menu.
- Search co the nam trong mobile menu hoac nam trong Catalog page.

### BookCard

BookCard la o sach trong Catalog.

BookCard hien:

- Cover.
- Title.
- Author.
- Price.
- Stock badge.
- View Detail button.
- Add to Cart button.

Behavior:

- Het hang thi disable `Add to Cart` va hien `Out of stock`.
- Title trong card toi da 2 dong.
- Click vao cover/title thi di Book Detail.
- Chua login bam `Add to Cart` thi chuyen `/login`.

### CartItemRow

CartItemRow hien:

- Cover.
- Title.
- Price.
- Quantity stepper.
- Line total.
- Remove button.

Behavior:

- Quantity dung nut `-` va `+`, co input so o giua.
- Quantity vuot stock thi hien loi ngay tai row.
- Remove item khong can confirm trong ban wireframe.

### CheckoutSummary

CheckoutSummary hien:

- Subtotal.
- Shipping fee.
- Total.
- Payment method: PayOS.
- Button Proceed to payment.

Behavior:

- Button disable neu chua co address hoac cart rong.
- Preview fail hien alert/error box tren dau summary.
- Shipping fee hien thanh mot dong rieng.
- Total la `subtotal + shippingFee`.

### AddressForm

AddressForm field:

- Recipient.
- Phone.
- Line.
- Ward.
- District.
- City.
- Is default.

Behavior:

- Checkout co form them address moi.
- Required: recipient, phone, line, city.
- Ward/district optional theo backend docs.
- Address mac dinh duoc danh dau bang label `Default`.

### OrderStatusBadge

OrderStatusBadge support cac status:

- `PENDING_PAYMENT`.
- `PAID`.
- `PROCESSING`.
- `SHIPPED`.
- `DELIVERED`.
- `CANCELLED`.

Behavior:

- Customer chi cancel `PENDING_PAYMENT`.
- Chi review khi order `DELIVERED`.

### AdminLayout

AdminLayout gom:

- Sidebar trai.
- Header tren.
- Content table/form.
- Menu: Dashboard, Books, Categories, Orders, Users, Reviews.

- Admin tach layout rieng.
- Sidebar chua can collapse o ban dau.
- Action button inline: Edit, Disable, Delete, Update Status.

## 8. Service/mock strategy

Page khong goi API truc tiep. Page goi service:

```text
authService
bookService
categoryService
cartService
checkoutService
paymentService
orderService
reviewService
adminService
```

Ban dau service tra mock data. Backend xong thi doi ben trong service sang API that.

Quy tac:

- Khong tu tao `axios` trong page.
- Khong hard-code API trong component.
- Khong moi nguoi tu bia data shape.
- Mock phai giong backend contract nhat co the.

## 9. Style co the doi sau khong?

Co, neu team lam dung cach.

Style se doi/nang cap de dang neu:

- Dung component chung thay vi moi page tu style rieng.
- Dung CSS variable/design token cho mau, spacing, radius.
- Khong inline style lung tung trong component.
- Layout va logic tach nhau.
- Admin va customer co layout rieng.
- BookCard, Button, Input, Table duoc dung lai nhieu noi.

Style se kho doi neu:

- Moi page tu tao button/input/table rieng.
- Mau sac hard-code o khap noi.
- Component vua xu ly API, vua xu ly layout, vua style phuc tap.
- CSS dat ten lung tung, khong co quy uoc.

Ket luan: ban dau co the lam "lo lo" trang den, sau nay doi dep hon duoc, mien la component va service duoc chot tu dau.

## 10. Definition of Done cho moi man hinh

Mot man hinh duoc coi la xong ban wireframe khi:

- Co route dung.
- Co layout dung.
- Co mock data hoac service call dung.
- Co loading state.
- Co empty state.
- Co error state.
- Co responsive co ban.
- Dung component chung.
- Khong hard-code API trong page.
- Khong pha data shape da chot.

## 11. Diem con mo

- Navbar mobile search nam dau?
- Login xong redirect ve trang truoc hay ve home neu khong co redirect?
- BookCard co Add to Cart truc tiep hay chi View Detail?
- Checkout address form hien cung luc voi address list hay mo modal?
- Admin book create/edit dung page rieng hay modal?
- Order status update trong admin dung dropdown hay modal confirm?
- Review form nam trong Book Detail hay Order Detail?
- Payment result mock status co can nut tao lai payment khong?

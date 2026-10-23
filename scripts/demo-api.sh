#!/usr/bin/env bash
# Gọi thử API sau khi chạy: npm run migrate && npm run seed && npm start
# Cần CSDL mới (chưa có phiếu): chạy lần 2 trên cùng CSDL sẽ vướng BR2 vì phiếu cũ vẫn đang mở.
B=${BASE_URL:-http://localhost:3000}
die() { echo "LỖI: $*" >&2; exit 1; }
# jget '<biểu thức JS theo r>' – đọc JSON từ stdin, in giá trị; JSON hỏng hoặc giá trị rỗng → mã thoát 1.
jget() { node -e 'const r=JSON.parse(require("fs").readFileSync(0));const v=eval(process.argv[1]);if(v==null)process.exit(1);console.log(v)' "$1" 2>/dev/null; }
login() { curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"Matkhau@123\"}" | jget r.token || die "đăng nhập $1 thất bại (đã chạy npm run seed chưa?)"; }
show() { echo; echo "\$ $1"; }
curl -sf "$B/health" >/dev/null || die "server chưa chạy ở $B (npm start)"
TN=$(login tn1) || exit 1; DP=$(login dp1) || exit 1; KT=$(login kt1) || exit 1
H="Content-Type: application/json"
custId() { curl -s "$B/api/customers?phone=$1" -H "Authorization: Bearer $TN" | jget r.id || die "không tìm thấy khách $1 (đã chạy npm run seed chưa?)"; }
C1=$(custId 0901234567) || exit 1; C2=$(custId 0912345678) || exit 1; C3=$(custId 0987654321) || exit 1
KT1_ID=$(curl -s "$B/api/technicians?active=true" -H "Authorization: Bearer $DP" | jget 'r.find(t=>t.fullName==="Phạm Huy")?.id') || die "không tìm thấy kỹ thuật viên kt1"

show "curl -s -X POST $B/api/auth/login -d '{\"username\":\"tn1\",...}'"
curl -s -X POST $B/api/auth/login -H "$H" -d '{"username":"tn1","password":"Matkhau@123"}' | node -pe 'const r=JSON.parse(require("fs").readFileSync(0)); JSON.stringify({...r, token: r.token.slice(0,20)+"…"})'

show "curl -s '$B/api/customers?phone=0901234567'   # Nhân viên tiếp nhận"
curl -s "$B/api/customers?phone=0901234567" -H "Authorization: Bearer $TN"; echo

show "curl -s '$B/api/devices?imei=359876543210987'   # máy đã hết hạn bảo hành (BR3)"
curl -s "$B/api/devices?imei=359876543210987" -H "Authorization: Bearer $TN"; echo

show "curl -s -X POST $B/api/tickets -d '{\"customerId\":$C1,\"imei\":\"356789012345678\",...}'"
curl -s -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":'$C1',"imei":"356789012345678","issueDescription":"Màn hình bị sọc ngang sau khi rơi"}'; echo

show "curl -s -X POST $B/api/tickets   # thiết bị mới (UC01-5a), khách 0912345678"
curl -s -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":'$C2',"imei":"352222333344445","model":"Galaxy S23","warrantyEndDate":"2027-08-20","issueDescription":"Pin tụt nhanh, sập nguồn ở 20%"}'; echo

show "curl -s -i -X POST $B/api/tickets   # cùng IMEI lần 2 → BR2"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":'$C1',"imei":"356789012345678","issueDescription":"Lỗi khác"}' | sed -n '1p;$p'; echo

show "curl -s -i -X POST $B/api/tickets -d '{\"customerId\":$C1,\"imei\":\"123\",...}'   # IMEI sai"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":'$C1',"imei":"123","issueDescription":"x"}' | sed -n '1p;$p'; echo

show "curl -s -i -X POST $B/api/tickets   # thiếu mô tả lỗi (UC01-7a)"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":'$C3',"imei":"351234567890123","issueDescription":"   "}' | sed -n '1p;$p'; echo

show "curl -s -i -X POST $B/api/tickets   # Điều phối viên tạo phiếu → 403 (NFR4)"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $DP" -d '{"customerId":'$C3',"imei":"351234567890123","issueDescription":"Không sạc được"}' | sed -n '1p;$p'; echo

show "curl -s -i $B/api/tickets   # không gửi token → 401"
curl -s -i $B/api/tickets | sed -n '1p;$p'; echo

show "curl -s '$B/api/tickets?status=NEW&page=1&size=20'   # Điều phối viên"
curl -s "$B/api/tickets?status=NEW&page=1&size=20" -H "Authorization: Bearer $DP"; echo

show "curl -s $B/api/tickets   # Kỹ thuật viên chỉ thấy phiếu của mình"
curl -s "$B/api/tickets" -H "Authorization: Bearer $KT"; echo

CODE=$(curl -s "$B/api/tickets?q=0901234567&status=NEW" -H "Authorization: Bearer $DP" | jget 'r.items[0]?.ticketCode') || die "không có phiếu NEW của khách 0901234567 – cần CSDL mới"
show "curl -s $B/api/tickets/$CODE"
curl -s "$B/api/tickets/$CODE" -H "Authorization: Bearer $DP"; echo

show "curl -s $B/api/issue-categories   # Điều phối viên"
curl -s "$B/api/issue-categories" -H "Authorization: Bearer $DP"; echo

show "curl -s $B/api/technicians?active=true   # Điều phối viên"
curl -s "$B/api/technicians?active=true" -H "Authorization: Bearer $DP"; echo

# ---------------- Sprint 2 (buổi 10): T4–T8 ----------------
show "curl -s -i -X POST $B/api/tickets/$CODE/assign   # chưa phân loại → 409 (UC03-1a)"
curl -s -i -X POST "$B/api/tickets/$CODE/assign" -H "$H" -H "Authorization: Bearer $DP" -d '{"technicianId":'$KT1_ID'}' | sed -n '1p;$p'; echo

show "curl -s -X POST $B/api/tickets/$CODE/classify -d '{\"issueCategoryId\":1,\"priority\":\"MEDIUM\"}'   # BR4: +72 giờ"
curl -s -X POST "$B/api/tickets/$CODE/classify" -H "$H" -H "Authorization: Bearer $DP" -d '{"issueCategoryId":1,"priority":"MEDIUM"}'; echo

show "curl -s -i -X POST $B/api/tickets/$CODE/assign   # Nhân viên tiếp nhận → 403 (UC03-4a)"
curl -s -i -X POST "$B/api/tickets/$CODE/assign" -H "$H" -H "Authorization: Bearer $TN" -d '{"technicianId":'$KT1_ID'}' | sed -n '1p;$p'; echo

show "curl -s -X POST $B/api/tickets/$CODE/assign -d '{\"technicianId\":$KT1_ID}'"
curl -s -X POST "$B/api/tickets/$CODE/assign" -H "$H" -H "Authorization: Bearer $DP" -d '{"technicianId":'$KT1_ID'}'; echo

show "curl -s -X POST $B/api/tickets/$CODE/start   # kt1 nhận phiếu (UC05)"
curl -s -X POST "$B/api/tickets/$CODE/start" -H "Authorization: Bearer $KT"; echo

show "curl -s $B/api/tickets/$CODE/history   # UC06"
curl -s "$B/api/tickets/$CODE/history" -H "Authorization: Bearer $DP"; echo

CODE2=$(curl -s "$B/api/tickets?q=0912345678&status=NEW" -H "Authorization: Bearer $DP" | jget 'r.items[0]?.ticketCode') || die "không có phiếu NEW của khách 0912345678 – cần CSDL mới"
show "curl -s -i -X POST $B/api/tickets/$CODE2/reject -d '{\"reason\":\"  \"}'   # thiếu lý do → 400 (BR6)"
curl -s -i -X POST "$B/api/tickets/$CODE2/reject" -H "$H" -H "Authorization: Bearer $DP" -d '{"reason":"  "}' | sed -n '1p;$p'; echo

show "curl -s -X POST $B/api/tickets/$CODE2/reject -d '{\"reason\":\"Máy vào nước, không thuộc diện bảo hành\"}'"
curl -s -X POST "$B/api/tickets/$CODE2/reject" -H "$H" -H "Authorization: Bearer $DP" -d '{"reason":"Máy vào nước, không thuộc diện bảo hành"}'; echo

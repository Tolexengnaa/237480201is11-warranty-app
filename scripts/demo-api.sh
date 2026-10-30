#!/usr/bin/env bash
# Gọi thử API sau khi chạy: npm run migrate && npm run seed && npm start
B=${BASE_URL:-http://localhost:3000}
login() { curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"Matkhau@123\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token'; }
show() { echo; echo "\$ $1"; }
TN=$(login tn1); DP=$(login dp1); KT=$(login kt1)
H="Content-Type: application/json"

show "curl -s -X POST $B/api/auth/login -d '{\"username\":\"tn1\",...}'"
curl -s -X POST $B/api/auth/login -H "$H" -d '{"username":"tn1","password":"Matkhau@123"}' | node -pe 'const r=JSON.parse(require("fs").readFileSync(0)); JSON.stringify({...r, token: r.token.slice(0,20)+"…"})'

show "curl -s '$B/api/customers?phone=0901234567'   # Nhân viên tiếp nhận"
curl -s "$B/api/customers?phone=0901234567" -H "Authorization: Bearer $TN"; echo

show "curl -s '$B/api/devices?imei=359876543210987'   # máy đã hết hạn bảo hành (BR3)"
curl -s "$B/api/devices?imei=359876543210987" -H "Authorization: Bearer $TN"; echo

show "curl -s -X POST $B/api/tickets -d '{\"customerId\":1,\"imei\":\"356789012345678\",...}'"
curl -s -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":1,"imei":"356789012345678","issueDescription":"Màn hình bị sọc ngang sau khi rơi"}'; echo

show "curl -s -X POST $B/api/tickets   # thiết bị mới (UC01-5a), khách 2"
curl -s -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":2,"imei":"352222333344445","model":"Galaxy S23","warrantyEndDate":"2027-08-20","issueDescription":"Pin tụt nhanh, sập nguồn ở 20%"}'; echo

show "curl -s -i -X POST $B/api/tickets   # cùng IMEI lần 2 → BR2"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":1,"imei":"356789012345678","issueDescription":"Lỗi khác"}' | sed -n '1p;$p'; echo

show "curl -s -i -X POST $B/api/tickets -d '{\"customerId\":1,\"imei\":\"123\",...}'   # IMEI sai"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":1,"imei":"123","issueDescription":"x"}' | sed -n '1p;$p'; echo

show "curl -s -i -X POST $B/api/tickets   # thiếu mô tả lỗi (UC01-7a)"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $TN" -d '{"customerId":3,"imei":"351234567890123","issueDescription":"   "}' | sed -n '1p;$p'; echo

show "curl -s -i -X POST $B/api/tickets   # Điều phối viên tạo phiếu → 403 (NFR4)"
curl -s -i -X POST $B/api/tickets -H "$H" -H "Authorization: Bearer $DP" -d '{"customerId":3,"imei":"351234567890123","issueDescription":"Không sạc được"}' | sed -n '1p;$p'; echo

show "curl -s -i $B/api/tickets   # không gửi token → 401"
curl -s -i $B/api/tickets | sed -n '1p;$p'; echo

show "curl -s '$B/api/tickets?status=NEW&page=1&size=20'   # Điều phối viên"
curl -s "$B/api/tickets?status=NEW&page=1&size=20" -H "Authorization: Bearer $DP"; echo

show "curl -s $B/api/tickets   # Kỹ thuật viên chỉ thấy phiếu của mình"
curl -s "$B/api/tickets" -H "Authorization: Bearer $KT"; echo

CODE=$(curl -s "$B/api/tickets?q=0901234567" -H "Authorization: Bearer $DP" | node -pe 'JSON.parse(require("fs").readFileSync(0)).items[0].ticketCode')
show "curl -s $B/api/tickets/$CODE"
curl -s "$B/api/tickets/$CODE" -H "Authorization: Bearer $DP"; echo

show "curl -s $B/api/issue-categories   # Điều phối viên"
curl -s "$B/api/issue-categories" -H "Authorization: Bearer $DP"; echo

show "curl -s $B/api/technicians?active=true   # Điều phối viên"
curl -s "$B/api/technicians?active=true" -H "Authorization: Bearer $DP"; echo

# ---------------- Sprint 2 (buổi 10): T4–T8 ----------------
show "curl -s -i -X POST $B/api/tickets/$CODE/assign   # chưa phân loại → 409 (UC03-1a)"
curl -s -i -X POST "$B/api/tickets/$CODE/assign" -H "$H" -H "Authorization: Bearer $DP" -d '{"technicianId":3}' | sed -n '1p;$p'; echo

show "curl -s -X POST $B/api/tickets/$CODE/classify -d '{\"issueCategoryId\":1,\"priority\":\"MEDIUM\"}'   # BR4: +72 giờ"
curl -s -X POST "$B/api/tickets/$CODE/classify" -H "$H" -H "Authorization: Bearer $DP" -d '{"issueCategoryId":1,"priority":"MEDIUM"}'; echo

show "curl -s -i -X POST $B/api/tickets/$CODE/assign   # Nhân viên tiếp nhận → 403 (UC03-4a)"
curl -s -i -X POST "$B/api/tickets/$CODE/assign" -H "$H" -H "Authorization: Bearer $TN" -d '{"technicianId":3}' | sed -n '1p;$p'; echo

show "curl -s -X POST $B/api/tickets/$CODE/assign -d '{\"technicianId\":3}'"
curl -s -X POST "$B/api/tickets/$CODE/assign" -H "$H" -H "Authorization: Bearer $DP" -d '{"technicianId":3}'; echo

show "curl -s -X POST $B/api/tickets/$CODE/start   # kt1 nhận phiếu (UC05)"
curl -s -X POST "$B/api/tickets/$CODE/start" -H "Authorization: Bearer $KT"; echo

show "curl -s $B/api/tickets/$CODE/history   # UC06"
curl -s "$B/api/tickets/$CODE/history" -H "Authorization: Bearer $DP"; echo

CODE2=$(curl -s "$B/api/tickets?q=0912345678" -H "Authorization: Bearer $DP" | node -pe 'JSON.parse(require("fs").readFileSync(0)).items[0].ticketCode')
show "curl -s -i -X POST $B/api/tickets/$CODE2/reject -d '{\"reason\":\"  \"}'   # thiếu lý do → 400 (BR6)"
curl -s -i -X POST "$B/api/tickets/$CODE2/reject" -H "$H" -H "Authorization: Bearer $DP" -d '{"reason":"  "}' | sed -n '1p;$p'; echo

show "curl -s -X POST $B/api/tickets/$CODE2/reject -d '{\"reason\":\"Máy vào nước, không thuộc diện bảo hành\"}'"
curl -s -X POST "$B/api/tickets/$CODE2/reject" -H "$H" -H "Authorization: Bearer $DP" -d '{"reason":"Máy vào nước, không thuộc diện bảo hành"}'; echo

<?php
include 'db.php';

$json_input = file_get_contents("php://input");
$data = json_decode($json_input);
$action = $_GET['action'] ?? ($data->action ?? '');
$method = $_SERVER['REQUEST_METHOD'];

// ดึงรายชื่อ Users ทั้งหมด พร้อม shop ถ้าเป็น merchant
if ($method == 'GET' && $action == 'get_users') {
    $search = $_GET['search'] ?? '';
    $role_filter = $_GET['role'] ?? 'all';

    $where_clauses = ["u.role != 'admin'"];

    if (!empty($search)) {
        $search_escaped = $conn->real_escape_string($search);
        $where_clauses[] = "(u.username LIKE '%$search_escaped%' OR u.fullname LIKE '%$search_escaped%' OR s.shop_name LIKE '%$search_escaped%')";
    }

    if ($role_filter !== 'all') {
        $role_escaped = $conn->real_escape_string($role_filter);
        $where_clauses[] = "u.role = '$role_escaped'";
    }

    $where_sql = implode(' AND ', $where_clauses);

    $sql = "SELECT u.id, u.username, u.fullname, u.phone, u.role, u.is_banned, u.created_at,
                   s.id as shop_id, s.shop_name, s.is_open, s.image as shop_image
            FROM users u
            LEFT JOIN shops s ON u.id = s.owner_id
            WHERE $where_sql
            ORDER BY u.created_at DESC";

    $result = $conn->query($sql);
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    echo json_encode(["status" => "success", "users" => $users]);
}

// ดึงรายละเอียด User คนเดียว พร้อม orders ล่าสุด
elseif ($method == 'GET' && $action == 'get_user_detail') {
    $uid = $_GET['user_id'];
    $order_search = $_GET['order_search'] ?? '';
    $order_status_filter = $_GET['order_status'] ?? 'all';

    // ดึงข้อมูล user
    $u_res = $conn->query("SELECT u.*, s.id as shop_id, s.shop_name, s.description, s.address as shop_address, s.is_open, s.image as shop_image FROM users u LEFT JOIN shops s ON u.id = s.owner_id WHERE u.id = '$uid'");
    $user = $u_res->fetch_assoc();

    // ดึง addresses
    $addr_res = $conn->query("SELECT * FROM addresses WHERE user_id = '$uid'");
    $addresses = [];
    while ($row = $addr_res->fetch_assoc()) $addresses[] = $row;

    // build where สำหรับ orders
    $order_where = "";
    if (!empty($order_search)) {
        $s = $conn->real_escape_string($order_search);
        
        // ลบ @ ออกถ้าพิมพ์นำหน้า เพื่อค้นหา username
        $s_clean = ltrim($s, '@');
        
        $order_where .= " AND (
            u.fullname LIKE '%$s%' 
            OR u.username LIKE '%$s_clean%'
            OR s.shop_name LIKE '%$s%'
        )";
    }
    
    if ($order_status_filter !== 'all') {
        $sf = $conn->real_escape_string($order_status_filter);
        $order_where .= " AND o.status = '$sf'";
    }

    if ($user['role'] === 'merchant' && $user['shop_id']) {
        $shop_id = $user['shop_id'];
        $ord_res = $conn->query("
            SELECT o.*, s.shop_name, s.image as shop_image,
                   u.username as customer_username, u.fullname as customer_name
            FROM orders o
            JOIN shops s ON o.shop_id = s.id
            JOIN users u ON o.customer_id = u.id
            WHERE o.shop_id = '$shop_id' $order_where
            ORDER BY o.id DESC
        ");
    } else {
        $ord_res = $conn->query("
            SELECT o.*, s.shop_name, s.image as shop_image,
                   u.username as customer_username, u.fullname as customer_name,
                   owner.username as shop_username
            FROM orders o
            JOIN shops s ON o.shop_id = s.id
            JOIN users u ON o.customer_id = u.id
            JOIN users owner ON s.owner_id = owner.id
            WHERE o.customer_id = '$uid' $order_where
            ORDER BY o.id DESC
        ");
    }

    $orders = [];
    while ($row = $ord_res->fetch_assoc()) {
        $oid = $row['id'];
        $items_res = $conn->query("SELECT * FROM order_items WHERE order_id = '$oid'");
        $items = [];
        while ($item = $items_res->fetch_assoc()) {
            $item['selected_options'] = json_decode($item['selected_options'] ?? '[]');
            $items[] = $item;
        }
        $row['items'] = $items;
        $orders[] = $row;
    }

    // ถ้าเป็น merchant ดึง products ด้วย
    $products = [];
    if ($user['role'] === 'merchant' && $user['shop_id']) {
        $prod_res = $conn->query("SELECT * FROM products WHERE shop_id = '{$user['shop_id']}'");
        while ($row = $prod_res->fetch_assoc()) {
            $row['options'] = json_decode($row['options'] ?? '[]');
            $products[] = $row;
        }
    }

    echo json_encode([
        "status" => "success",
        "user" => $user,
        "addresses" => $addresses,
        "orders" => $orders,
        "products" => $products
    ]);
}
// แบน / ปลดแบน User
elseif ($method == 'POST' && $action == 'toggle_ban') {
    $admin_id   = $data->admin_id;
    $target_id  = $data->target_id;
    $ban_status = $data->ban_status;
    $ban_reason = $conn->real_escape_string($data->ban_reason ?? '');
    $ban_message= $conn->real_escape_string($data->ban_message ?? '');

    if ($ban_status == 1) {
        $conn->query("UPDATE users SET is_banned=1, ban_reason='$ban_reason', ban_message='$ban_message', banned_at=NOW() WHERE id='$target_id'");
        // บันทึก notification แบน
        $notif_msg = "บัญชีของคุณถูกระงับ เหตุผล: $ban_reason" . ($ban_message ? " — $ban_message" : "");
        $conn->query("INSERT INTO notifications (user_id, admin_id, category, type, message) VALUES ('$target_id', '$admin_id', 'การแบน', 'ban', '$notif_msg')");
    } else {
        $conn->query("UPDATE users SET is_banned=0, ban_reason=NULL, ban_message=NULL, banned_at=NULL WHERE id='$target_id'");
        // บันทึก notification ปลดแบน
        $conn->query("INSERT INTO notifications (user_id, admin_id, category, type, message) VALUES ('$target_id', '$admin_id', 'การปลดแบน', 'unban', 'บัญชีของคุณได้รับการปลดแบนแล้ว สามารถใช้งานได้ตามปกติ')");
    }

    $action_type = $ban_status == 1 ? 'ban' : 'unban';
    $detail = $ban_status == 1 ? "แบนผู้ใช้: $ban_reason" : 'ปลดแบนผู้ใช้';
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', '$action_type', '$target_id', '$detail')");

    echo json_encode(["status" => "success"]);
}

// ส่งแจ้งเตือนไปยังผู้ใช้
elseif ($method == 'POST' && $action == 'send_notification') {
    $admin_id = $data->admin_id;
    $user_id  = $data->user_id;
    $category = $conn->real_escape_string($data->category);
    $message  = $conn->real_escape_string($data->message);

    $conn->query("INSERT INTO notifications (user_id, admin_id, category, message) VALUES ('$user_id', '$admin_id', '$category', '$message')");

    $detail = "แจ้งเตือนผู้ใช้ ID:$user_id หมวด: $category";
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', 'edit_user', '$user_id', '$detail')");

    echo json_encode(["status" => "success"]);
}

// ดึงประวัติแจ้งเตือนของ user คนนั้น admin ดู
elseif ($method == 'GET' && $action == 'get_notifications') {
    $user_id = $_GET['user_id'];
    $sql = "SELECT n.*, u.fullname as admin_name 
            FROM notifications n 
            JOIN users u ON n.admin_id = u.id 
            WHERE n.user_id = '$user_id' 
            ORDER BY n.created_at DESC";
    $result = $conn->query($sql);
    $notifs = [];
    while ($row = $result->fetch_assoc()) $notifs[] = $row;
    echo json_encode(["status" => "success", "notifications" => $notifs]);
}

// ดึงแจ้งเตือนของ user เอง customer/merchant ดู
elseif ($method == 'GET' && $action == 'get_my_notifications') {
    $user_id = $_GET['user_id'];
    $sql = "SELECT n.*, u.fullname as admin_name 
            FROM notifications n 
            LEFT JOIN users u ON n.admin_id = u.id 
            WHERE n.user_id = '$user_id' 
            ORDER BY n.created_at DESC 
            LIMIT 50";
    $result = $conn->query($sql);
    $notifs = [];
    while ($row = $result->fetch_assoc()) $notifs[] = $row;

    // นับ unread <- ส่วนที่หายไป
    $unread_res = $conn->query("SELECT COUNT(*) as cnt FROM notifications WHERE user_id='$user_id' AND is_read='0'");
    $unread = $unread_res->fetch_assoc()['cnt'];

    echo json_encode(["status" => "success", "notifications" => $notifs, "unread_count" => (int)$unread]);
}

elseif ($method == 'GET' && $action == 'check_ban') {
    $user_id = $_GET['user_id'];
    $res = $conn->query("SELECT is_banned, ban_reason, ban_message FROM users WHERE id = '$user_id'");
    $row = $res->fetch_assoc();
    echo json_encode([
        "is_banned"   => $row['is_banned'] ?? 0,
        "ban_reason"  => $row['ban_reason'] ?? null,
        "ban_message" => $row['ban_message'] ?? null
    ]);
}

// ลบ User ถาวร
elseif ($method == 'POST' && $action == 'delete_user') {
    $admin_id = $data->admin_id;
    $target_id = $data->target_id;

    // ดึงชื่อก่อนลบเพื่อ log
    $u_res = $conn->query("SELECT username, fullname FROM users WHERE id = '$target_id'");
    $u = $u_res->fetch_assoc();
    $detail = "ลบบัญชี: {$u['username']} ({$u['fullname']})";

    // ปิด FK ชั่วคราว ลบข้อมูลที่เกี่ยวข้องก่อน แล้วค่อยลบ user
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");

    // ลบ orders และ order_items ของ user นี้
    $orders_res = $conn->query("SELECT id FROM orders WHERE customer_id = '$target_id'");
    while ($row = $orders_res->fetch_assoc()) {
        $conn->query("DELETE FROM order_items WHERE order_id = '{$row['id']}'");
    }
    $conn->query("DELETE FROM orders WHERE customer_id = '$target_id'");

    // ลบข้อมูลที่เกี่ยวข้องอื่นๆ
    $conn->query("DELETE FROM addresses WHERE user_id = '$target_id'");
    $conn->query("DELETE FROM notifications WHERE user_id = '$target_id'");
    $conn->query("DELETE FROM tickets WHERE sender_id = '$target_id'");

    // ถ้าเป็น merchant ลบร้านและสินค้าด้วย
    $shop_res = $conn->query("SELECT id FROM shops WHERE owner_id = '$target_id'");
    if ($shop = $shop_res->fetch_assoc()) {
        $conn->query("DELETE FROM products WHERE shop_id = '{$shop['id']}'");
        $conn->query("DELETE FROM shops WHERE id = '{$shop['id']}'");
    }

    // ลบ user
    $conn->query("DELETE FROM users WHERE id = '$target_id'");

    $conn->query("SET FOREIGN_KEY_CHECKS = 1");

    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', 'delete_user', NULL, '$detail')");

    echo json_encode(["status" => "success"]);
}

// แก้ไขข้อมูล User
elseif ($method == 'POST' && $action == 'edit_user') {
    $admin_id = $data->admin_id;
    $target_id = $data->target_id;
    $fullname = $data->fullname;
    $phone = $data->phone;
    $password = $data->password ?? '';

    if (!empty($password)) {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE users SET fullname=?, phone=?, password=? WHERE id=?");
        $stmt->bind_param("sssi", $fullname, $phone, $hashed, $target_id);
    } else {
        $stmt = $conn->prepare("UPDATE users SET fullname=?, phone=? WHERE id=?");
        $stmt->bind_param("ssi", $fullname, $phone, $target_id);
    }
    $stmt->execute();

    if (!empty($data->shop_name)) {
        $shop_name = $data->shop_name;
        $description = $data->description ?? '';
        $conn->query("UPDATE shops SET shop_name='$shop_name', description='$description' WHERE owner_id='$target_id'");
    }

    $detail = "แก้ไขข้อมูลผู้ใช้ ID: $target_id";
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', 'edit_user', '$target_id', '$detail')");

    echo json_encode(["status" => "success"]);
}

// ดึง Tickets ทั้งหมด
elseif ($method == 'GET' && $action == 'get_tickets') {
    $search = $_GET['search'] ?? '';
    $status_filter = $_GET['status'] ?? 'all';

    $where = "1=1";
    if (!empty($search)) {
        $s = $conn->real_escape_string($search);
        $where .= " AND (u_sender.username LIKE '%$s%' OR t.subject LIKE '%$s%')";
    }
    if ($status_filter !== 'all') {
        $sf = $conn->real_escape_string($status_filter);
        $where .= " AND t.status = '$sf'";
    }

    $sql = "SELECT t.*, 
                   u_sender.username as sender_username, u_sender.fullname as sender_fullname, u_sender.role as sender_role,
                   u_target.username as target_username, u_target.fullname as target_fullname
            FROM tickets t
            JOIN users u_sender ON t.sender_id = u_sender.id
            LEFT JOIN users u_target ON t.target_id = u_target.id
            WHERE $where
            ORDER BY t.created_at DESC";

    $result = $conn->query($sql);
    $tickets = [];
    while ($row = $result->fetch_assoc()) $tickets[] = $row;
    echo json_encode(["status" => "success", "tickets" => $tickets]);
}

// อัปเดตสถานะ Ticket
elseif ($method == 'POST' && $action == 'update_ticket') {
    $admin_id  = $data->admin_id;
    $ticket_id = $data->ticket_id;
    $status    = $data->status;

    $conn->query("UPDATE tickets SET status='$status' WHERE id='$ticket_id'");

    // ดึง sender_id และ subject ของ ticket
    $t_res = $conn->query("SELECT sender_id, subject FROM tickets WHERE id='$ticket_id'");
    $t = $t_res->fetch_assoc();

    $status_labels = [
        'in_progress' => 'กำลังดำเนินการ',
        'resolved'    => 'เสร็จสิ้น',
        'rejected'    => 'ถูกปฏิเสธ'
    ];
    $label = $status_labels[$status] ?? $status;
    $notif_msg = "คำร้องของคุณ \"{$t['subject']}\" อัปเดตสถานะเป็น: $label";
    $sender_id = $t['sender_id'];
    $conn->query("INSERT INTO notifications (user_id, admin_id, category, type, message) VALUES ('$sender_id', '$admin_id', 'อัปเดตคำร้อง', 'ticket_update', '$notif_msg')");

    $action_type = ($status === 'resolved') ? 'resolve_ticket' : 'reject_ticket';
    $detail = "อัปเดต Ticket #$ticket_id เป็น $status";
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', '$action_type', NULL, '$detail')");

    echo json_encode(["status" => "success"]);
}

// ดึง notifications ของ user พร้อม unread count
elseif ($method == 'GET' && $action == 'get_my_notifications') {
    $user_id = $_GET['user_id'];
    $sql = "SELECT n.*, u.fullname as admin_name 
            FROM notifications n 
            LEFT JOIN users u ON n.admin_id = u.id 
            WHERE n.user_id = '$user_id' 
            ORDER BY n.created_at DESC 
            LIMIT 50";
    $result = $conn->query($sql);
    $notifs = [];
    while ($row = $result->fetch_assoc()) $notifs[] = $row;

    // นับ unread
    $unread_res = $conn->query("SELECT COUNT(*) as cnt FROM notifications WHERE user_id='$user_id' AND is_read=0");
    $unread = $unread_res->fetch_assoc()['cnt'];

    echo json_encode(["status" => "success", "notifications" => $notifs, "unread_count" => (int)$unread]);
}

// mark all read
elseif ($method == 'POST' && $action == 'mark_notifications_read') {
    $user_id = $data->user_id;
    $conn->query("UPDATE notifications SET is_read=1 WHERE user_id='$user_id'");
    echo json_encode(["status" => "success"]);
}

// นับ pending tickets สำหรับ Admin badge
elseif ($method == 'GET' && $action == 'get_pending_tickets_count') {
    $result = $conn->query("SELECT COUNT(*) as cnt FROM tickets WHERE status IN ('open','in_progress')");
    $cnt = $result->fetch_assoc()['cnt'];
    echo json_encode(["status" => "success", "count" => (int)$cnt]);
}

// ดึง Admin Logs (ประวัติ)
elseif ($method == 'GET' && $action == 'get_logs') {
    $search = $_GET['search'] ?? '';
    $action_filter = $_GET['action_filter'] ?? 'all';

    $where = "1=1";

    if (!empty($search)) {
        $s = $conn->real_escape_string($search);
        $where .= " AND (u_admin.fullname LIKE '%$s%' OR u_admin.username LIKE '%$s%' 
                        OR u_target.fullname LIKE '%$s%' OR u_target.username LIKE '%$s%'
                        OR al.detail LIKE '%$s%')";
    }

    if ($action_filter !== 'all') {
        $af = $conn->real_escape_string($action_filter);
        $where .= " AND al.action = '$af'";
    }

    $sql = "SELECT al.*, 
                   u_admin.username as admin_username,
                   u_admin.fullname as admin_fullname,
                   u_target.username as target_username,
                   u_target.fullname as target_fullname
            FROM admin_logs al
            JOIN users u_admin ON al.admin_id = u_admin.id
            LEFT JOIN users u_target ON al.target_user_id = u_target.id
            WHERE $where
            ORDER BY al.created_at DESC
            LIMIT 100";

    $result = $conn->query($sql);
    $logs = [];
    while ($row = $result->fetch_assoc()) $logs[] = $row;
    echo json_encode(["status" => "success", "logs" => $logs]);
}

// ส่ง Ticket ฝั่ง Customer/Merchant ใช้
elseif ($method == 'POST' && $action == 'submit_ticket') {
    $sender_id = $data->sender_id;
    $target_id = $data->target_id ?? null;
    $type = $data->type;
    $subject = $data->subject;
    $message = $data->message;

    $stmt = $conn->prepare("INSERT INTO tickets (sender_id, target_id, type, subject, message) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("iisss", $sender_id, $target_id, $type, $subject, $message);
    
    if ($stmt->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error", "message" => $conn->error]);
}

// ดึงคำร้องอุทธรณ์ล่าสุดของ user เฉพาะ type = request และ subject มีคำว่าอุทธรณ์
elseif ($method == 'GET' && $action == 'get_my_appeal') {
    $user_id = $_GET['user_id'];
    $banned_at = $_GET['banned_at'] ?? null;

    // ถ้ามี banned_at ให้ดึงเฉพาะ ticket ที่สร้างหลังจากถูกแบนครั้งนี้
    $date_filter = '';
    if ($banned_at) {
        $ba = $conn->real_escape_string($banned_at);
        $date_filter = "AND created_at >= '$ba'";
    }

    $result = $conn->query("
        SELECT id, status FROM tickets 
        WHERE sender_id = '$user_id' 
        AND type = 'request' 
        AND subject LIKE '%อุทธรณ์%'
        $date_filter
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $ticket = $result->fetch_assoc();
    echo json_encode(["status" => "success", "ticket" => $ticket ?: null]);
}

?>
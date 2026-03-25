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
        $order_where .= " AND (u.fullname LIKE '%$s%' OR u.username LIKE '%$s%' OR s.shop_name LIKE '%$s%')";
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
    $admin_id = $data->admin_id;
    $target_id = $data->target_id;
    $ban_status = $data->ban_status; // 1 = แบน, 0 = ปลดแบน

    $conn->query("UPDATE users SET is_banned = '$ban_status' WHERE id = '$target_id'");

    // บันทึก log
    $action_type = $ban_status == 1 ? 'ban' : 'unban';
    $detail = $ban_status == 1 ? 'Admin สั่งแบนผู้ใช้' : 'Admin ปลดแบนผู้ใช้';
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', '$action_type', '$target_id', '$detail')");

    echo json_encode(["status" => "success"]);
}

// ลบ User ถาวร
elseif ($method == 'POST' && $action == 'delete_user') {
    $admin_id = $data->admin_id;
    $target_id = $data->target_id;

    // ดึงชื่อก่อนลบเพื่อ log
    $u_res = $conn->query("SELECT username, fullname FROM users WHERE id = '$target_id'");
    $u = $u_res->fetch_assoc();
    $detail = "ลบบัญชี: {$u['username']} ({$u['fullname']})";

    $conn->query("DELETE FROM users WHERE id = '$target_id'");

    // บันทึก log (target_user_id = NULL เพราะลบไปแล้ว)
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', 'delete_user', NULL, '$detail')");

    echo json_encode(["status" => "success"]);
}

// แก้ไขข้อมูล User
elseif ($method == 'POST' && $action == 'edit_user') {
    $admin_id = $data->admin_id;
    $target_id = $data->target_id;
    $fullname = $data->fullname;
    $phone = $data->phone;

    $stmt = $conn->prepare("UPDATE users SET fullname=?, phone=? WHERE id=?");
    $stmt->bind_param("ssi", $fullname, $phone, $target_id);
    $stmt->execute();

    // ถ้าเป็น merchant อัปเดต shop ด้วย
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
    $admin_id = $data->admin_id;
    $ticket_id = $data->ticket_id;
    $status = $data->status; // resolved | rejected | in_progress

    $conn->query("UPDATE tickets SET status='$status' WHERE id='$ticket_id'");

    $action_type = ($status === 'resolved') ? 'resolve_ticket' : 'reject_ticket';
    $detail = "อัปเดต Ticket #$ticket_id เป็น $status";
    $conn->query("INSERT INTO admin_logs (admin_id, action, target_user_id, detail) VALUES ('$admin_id', '$action_type', NULL, '$detail')");

    echo json_encode(["status" => "success"]);
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
?>
<?php
include 'db.php';

// รองรับ JSON input
$json_input = file_get_contents("php://input");
$data = json_decode($json_input);

$action = $_GET['action'] ?? $_POST['action'] ?? ($data->action ?? '');
$method = $_SERVER['REQUEST_METHOD'];

//  ดึงข้อมูลร้านค้า 
if ($method == 'GET' && $action == 'get_shops') {
    $sql = "SELECT s.*, u.phone 
            FROM shops s 
            JOIN users u ON s.owner_id = u.id";
            
    $result = $conn->query($sql);
    $shops = [];
    while($row = $result->fetch_assoc()) {
        $shops[] = $row;
    }
    echo json_encode(["status" => "success", "shops" => $shops]);
}

//  (ใหม่) ดึงข้อมูลโปรไฟล์และที่อยู่ 
elseif ($method == 'GET' && $action == 'get_profile') {
    $user_id = $_GET['user_id'];
    
    // ดึงข้อมูล User
    $u_sql = "SELECT id, username, fullname, phone FROM users WHERE id = '$user_id'";
    $u_res = $conn->query($u_sql);
    $user = $u_res->fetch_assoc();
    
    // ดึงที่อยู่ทั้งหมด
    $a_sql = "SELECT * FROM addresses WHERE user_id = '$user_id'";
    $a_res = $conn->query($a_sql);
    $addresses = [];
    while($row = $a_res->fetch_assoc()) {
        $addresses[] = $row;
    }
    
    echo json_encode(["status" => "success", "user" => $user, "addresses" => $addresses]);
}

//  (ใหม่) อัปเดตโปรไฟล์และที่อยู่ 
elseif ($method == 'POST' && $action == 'update_profile') {
    $user_id = $data->user_id;
    $fullname = $data->fullname;
    $phone = $data->phone;
    $password = $data->password;
    $addresses = $data->addresses;

    // อัปเดตข้อมูลส่วนตัว
    $sql = "UPDATE users SET fullname = ?, phone = ?";
    $params = [$fullname, $phone];
    $types = "ss";

    if (!empty($password)) {
        $sql .= ", password = ?";
        $params[] = password_hash($password, PASSWORD_DEFAULT); // hash รหัสผ่าน (ถ้าในระบบใช้ hash) หรือใช้ $password ตรงๆ ถ้าไม่ได้ hash
        $types .= "s";
    }
    $sql .= " WHERE id = ?";
    $params[] = $user_id;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();

    // อัปเดตที่อยู่ ลบของเก่าทิ้ง แล้วเพิ่มใหม่ทั้งหมด
    $conn->query("DELETE FROM addresses WHERE user_id = '$user_id'");
    
    if (!empty($addresses)) {
        $stmt_addr = $conn->prepare("INSERT INTO addresses (user_id, address_text, contact_phone) VALUES (?, ?, ?)");
        foreach ($addresses as $addr) {
            // ป้องกันข้อมูลว่าง
            if(trim($addr->address_text) != "") {
                $stmt_addr->bind_param("iss", $user_id, $addr->address_text, $addr->contact_phone);
                $stmt_addr->execute();
            }
        }
    }

    echo json_encode(["status" => "success"]);
}

//  (ใหม่) ลบบัญชีถาวร 
elseif ($method == 'POST' && $action == 'delete_account') {
    $user_id = $data->user_id;
    $username_confirmation = $data->username_confirmation;

    // ตรวจสอบ Username ก่อนลบ
    $check = $conn->query("SELECT username FROM users WHERE id = '$user_id'");
    $row = $check->fetch_assoc();

    if ($row && $row['username'] === $username_confirmation) {
        // ลบ User ตารางที่อยู่จะหายไปเองเพราะ ON DELETE CASCADE
        $conn->query("DELETE FROM users WHERE id = '$user_id'");
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "ชื่อผู้ใช้งานไม่ถูกต้อง ยืนยันการลบไม่สำเร็จ"]);
    }
}
?>
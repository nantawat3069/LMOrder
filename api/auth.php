<?php
include 'db.php';

// อ่านข้อมูล JSON ที่ส่งมาจาก React
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit();
}

$action = $data->action;

//  สมัครสมาชิก 
if ($action == 'register') {
    $username = $data->username;
    $password = password_hash($data->password, PASSWORD_DEFAULT);
    $fullname = $data->fullname;
    $phone = $data->phone;
    $role = $data->role;

    // เช็ค username ซ้ำ
    $check = $conn->query("SELECT id FROM users WHERE username = '$username'");
    if ($check->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"]);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO users (username, password, fullname, phone, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $username, $password, $fullname, $phone, $role);
    
    if ($stmt->execute()) {
        $user_id = $stmt->insert_id;
        // ถ้าเป็นร้านค้า สร้างร้านรอไว้เลย
        if ($role == 'merchant') {
            $shop_name = "ร้านของ " . $fullname;
            $conn->query("INSERT INTO shops (owner_id, shop_name) VALUES ('$user_id', '$shop_name')");
        }
        echo json_encode(["status" => "success", "message" => "สมัครสมาชิกสำเร็จ"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database error"]);
    }
}

//  เข้าสู่ระบบ 
elseif ($action == 'login') {
    $username = $data->username;
    $password = $data->password;

    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        if (password_verify($password, $user['password'])) {

            $shop_id = null;
            if ($user['role'] == 'merchant') {
                $s = $conn->query("SELECT id FROM shops WHERE owner_id = " . $user['id']);
                $shop = $s->fetch_assoc();
                $shop_id = $shop['id'];
            }

            echo json_encode([
                "status" => "success",
                "user" => [
                    "id" => $user['id'],
                    "fullname" => $user['fullname'],
                    "role" => $user['role'],
                    "shop_id" => $shop_id,
                    "is_banned" => $user['is_banned'],
                    "ban_reason" => $user['ban_reason'] ?? null,
                    "ban_message" => $user['ban_message'] ?? null
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "รหัสผ่านไม่ถูกต้อง"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "ไม่พบชื่อผู้ใช้นี้"]);
    } 
}
//  สมัครบัญชี Admin 
elseif ($action == 'register_admin') {
    $secret_key = $data->secret_key;
    $username   = $data->username;
    $password   = password_hash($data->password, PASSWORD_DEFAULT);
    $fullname   = $data->fullname;
    $phone      = $data->phone;

    // เช็ค Secret Key
    if ($secret_key !== 'admin0') {
        echo json_encode(["status" => "error", "message" => "Secret Key ไม่ถูกต้อง"]);
        exit();
    }

    // เช็ค username ซ้ำ
    $check = $conn->query("SELECT id FROM users WHERE username = '$username'");
    if ($check->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"]);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO users (username, password, fullname, phone, role, is_banned) VALUES (?, ?, ?, ?, 'admin', 0)");
    $stmt->bind_param("ssss", $username, $password, $fullname, $phone);

    if ($stmt->execute()) {
        $new_id = $stmt->insert_id;
        echo json_encode([
            "status" => "success",
            "user" => [
                "id"       => $new_id,
                "fullname" => $fullname,
                "role"     => "admin",
                "shop_id"  => null
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database error"]);
    }
}
?>
<?php
include 'db.php';

$json_input = file_get_contents("php://input");
$data = json_decode($json_input);

$action = $_GET['action'] ?? $_POST['action'] ?? ($data->action ?? '');
$method = $_SERVER['REQUEST_METHOD'];

//  ดึงข้อมูลร้านค้า สำหรับ Merchant Dashboard
if ($method == 'GET' && $action == 'get_shop_data') {
    $owner_id = $_GET['owner_id'];
    $sql = "SELECT * FROM shops WHERE owner_id = '$owner_id'";
    $result = $conn->query($sql);
    
    if ($result->num_rows == 0) {
        echo json_encode(["status" => "error", "message" => "Shop not found"]);
        exit();
    }
    
    $shop = $result->fetch_assoc();
    $shop_id = $shop['id'];
    
    $products = [];
    $p_sql = "SELECT * FROM products WHERE shop_id = '$shop_id' ORDER BY id DESC";
    $p_result = $conn->query($p_sql);
    
    while($row = $p_result->fetch_assoc()) {
        $row['options'] = json_decode($row['options'] ?? '[]'); 
        if (!isset($row['is_available'])) $row['is_available'] = 1;
        $products[] = $row;
    }
    
    echo json_encode(["status" => "success", "shop" => $shop, "products" => $products]);
}

//  เพิ่มเมนูอาหาร 
elseif ($method == 'POST' && $action == 'add_product') {
    $shop_id = $_POST['shop_id'];
    $name = $_POST['name'];
    $price = $_POST['price'];
    $options = $_POST['options']; 
    
    $image_name = "";
    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $image_name = "menu_" . time() . "." . $ext;
        require_once 'cloudinary_upload.php';
        $image_name = uploadToCloudinary($_FILES['image']['tmp_name'], $_FILES['image']['name']);
    }
    
    $stmt = $conn->prepare("INSERT INTO products (shop_id, name, price, image, options, is_available) VALUES (?, ?, ?, ?, ?, 1)");
    $stmt->bind_param("isdss", $shop_id, $name, $price, $image_name, $options);
    
    if ($stmt->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error", "message" => $conn->error]);
}

//  ลบเมนู 
elseif ($method == 'POST' && $action == 'delete_product') {
    $pid = $data->product_id;
    $conn->query("DELETE FROM products WHERE id = '$pid'");
    echo json_encode(["status" => "success"]);
}

//  เปิด/ปิด ร้าน 
elseif ($method == 'POST' && $action == 'toggle_status') {
    $shop_id = $data->shop_id;
    $status = $data->status;
    $conn->query("UPDATE shops SET is_open = '$status' WHERE id = '$shop_id'");
    echo json_encode(["status" => "success"]);
}

//  เปิด/ปิด เมนู 
elseif ($method == 'POST' && $action == 'toggle_product_status') {
    $product_id = $data->product_id;
    $status = $data->status; 
    $conn->query("UPDATE products SET is_available = '$status' WHERE id = '$product_id'");
    echo json_encode(["status" => "success"]);
}

//  แก้ไขเมนู 
elseif ($method == 'POST' && $action == 'update_product') {
    $product_id = $_POST['product_id'];
    $name = $_POST['name'];
    $price = $_POST['price'];
    $options = $_POST['options'];
    
    $sql = "UPDATE products SET name=?, price=?, options=?";
    $params = [$name, $price, $options];
    $types = "sds";

    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $image_name = "menu_" . time() . "." . $ext;
        require_once 'cloudinary_upload.php';
        $image_name = uploadToCloudinary($_FILES['image']['tmp_name'], $_FILES['image']['name']);
        $sql .= ", image=?";
        $params[] = $image_name;
        $types .= "s";
    }

    $sql .= " WHERE id=?";
    $params[] = $product_id;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error", "message" => $conn->error]);
}

//  ใหม่ ดึงข้อมูลโปรไฟล์ร้านค้า รวม User + Shop
elseif ($method == 'GET' && $action == 'get_merchant_profile') {
    $owner_id = $_GET['owner_id'];
    
    // Join users กับ shops
    $sql = "SELECT u.id as user_id, u.username, u.fullname as owner_name, u.phone as owner_phone,
                s.id as shop_id, s.shop_name, s.description, s.address as shop_address, 
                s.image as shop_image, s.bank_name, s.bank_account, s.bank_account_name, s.qr_code
            FROM users u 
            JOIN shops s ON u.id = s.owner_id 
            WHERE u.id = '$owner_id'";
            
    $result = $conn->query($sql);
    if ($row = $result->fetch_assoc()) {
        echo json_encode(["status" => "success", "data" => $row]);
    } else {
        echo json_encode(["status" => "error", "message" => "Profile not found"]);
    }
}

//  ใหม่ อัปเดตโปรไฟล์ร้านค้า 
elseif ($method == 'POST' && $action == 'update_merchant_profile') {
    $user_id = $_POST['user_id'];
    $shop_id = $_POST['shop_id'];
    
    // ข้อมูล User
    $owner_name = $_POST['owner_name'];
    $owner_phone = $_POST['owner_phone'];
    $password = $_POST['password']; // ถ้าว่างคือไม่เปลี่ยน

    // ข้อมูล Shop
    $shop_name = $_POST['shop_name'];
    $description = $_POST['description'];
    $shop_address = $_POST['shop_address'];

    // อัปเดต User
    $u_sql = "UPDATE users SET fullname=?, phone=?";
    $u_params = [$owner_name, $owner_phone];
    $u_types = "ss";
    
    if (!empty($password)) {
        $u_sql .= ", password=?";
        $u_params[] = password_hash($password, PASSWORD_DEFAULT);
        $u_types .= "s";
    }
    $u_sql .= " WHERE id=?";
    $u_params[] = $user_id;
    $u_types .= "i";
    
    $stmt_u = $conn->prepare($u_sql);
    $stmt_u->bind_param($u_types, ...$u_params);
    $stmt_u->execute();

    // อัปเดต Shop
    $bank_name = $_POST['bank_name'] ?? '';
    $bank_account = $_POST['bank_account'] ?? '';
    $bank_account_name = $_POST['bank_account_name'] ?? '';

    $s_sql = "UPDATE shops SET shop_name=?, description=?, address=?, bank_name=?, bank_account=?, bank_account_name=?";
    $s_params = [$shop_name, $description, $shop_address, $bank_name, $bank_account, $bank_account_name];
    $s_types = "ssssss";

    // อัปโหลด QR Code (เพิ่มต่อจากส่วนอัปโหลด shop_image เดิม)
    if (isset($_FILES['qr_code']) && $_FILES['qr_code']['error'] == 0) {
        require_once 'cloudinary_upload.php';
        $qr_name = uploadToCloudinary($_FILES['qr_code']['tmp_name'], $_FILES['qr_code']['name']);
        $s_sql .= ", qr_code=?";
        $s_params[] = $qr_name;
        $s_types .= "s";
    }

    // อัปโหลดรูปหน้าร้าน
    if (isset($_FILES['shop_image']) && $_FILES['shop_image']['error'] == 0) {
        require_once 'cloudinary_upload.php';
        $image_name = uploadToCloudinary($_FILES['shop_image']['tmp_name'], $_FILES['shop_image']['name']);
        $s_sql .= ", image=?";
        $s_params[] = $image_name;
        $s_types .= "s";
    }

    $s_sql .= " WHERE id=?";
    $s_params[] = $shop_id;
    $s_types .= "i";

    $stmt_s = $conn->prepare($s_sql);
    $stmt_s->bind_param($s_types, ...$s_params);
    
    if ($stmt_s->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error", "message" => $conn->error]);
}

//  ใหม่ ลบบัญชีร้านค้าถาวร 
elseif ($method == 'POST' && $action == 'delete_merchant_account') {
    $user_id = $data->user_id;
    $username_confirmation = $data->username_confirmation;

    $check = $conn->query("SELECT username FROM users WHERE id = '$user_id'");
    $row = $check->fetch_assoc();

    if ($row && $row['username'] === $username_confirmation) {

        $conn->query("DELETE FROM shops WHERE owner_id = '$user_id'");
        $conn->query("DELETE FROM users WHERE id = '$user_id'");
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Username ไม่ถูกต้อง"]);
    }
}
?>
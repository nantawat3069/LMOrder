<?php
include 'db.php';

$json_input = file_get_contents("php://input");
$data = json_decode($json_input);

$action = $_GET['action'] ?? $_POST['action'] ?? ($data->action ?? '');

//  สั่งซื้อสินค้า 
if ($action == 'place_order') {
    $customer_id = $data->customer_id;
    $shop_id = $data->shop_id;
    $total_price = $data->total_price;
    $address = $data->address;
    $payment_method = $data->payment_method;
    $items = $data->items;

    $stmt = $conn->prepare("INSERT INTO orders (customer_id, shop_id, total_price, address, payment_method, status) VALUES (?, ?, ?, ?, ?, 'pending')");
    $stmt->bind_param("iidss", $customer_id, $shop_id, $total_price, $address, $payment_method);
    
    if ($stmt->execute()) {
        $order_id = $stmt->insert_id;
        
        $stmt_item = $conn->prepare("INSERT INTO order_items (order_id, product_id, product_name, price, quantity, selected_options, special_instruction) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($items as $item) {
            $sel_opts = json_encode($item->selected_options ?? []);
            $special_ins = $item->special_instruction ?? "";
            
            $stmt_item->bind_param("iisdiss", $order_id, $item->id, $item->name, $item->price, $item->qty, $sel_opts, $special_ins);
            $stmt_item->execute();
        }
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
}

//  ดึงเมนูของร้าน ใช้ตอนเลือกร้านในหน้า Customer
elseif ($action == 'get_shop_menu') {
    $shop_id = $_GET['shop_id'];
    $products = [];
    $p_res = $conn->query("SELECT * FROM products WHERE shop_id = '$shop_id'");
    while($row = $p_res->fetch_assoc()) {
        $row['options'] = json_decode($row['options'] ?? '[]');
        $products[] = $row;
    }
    echo json_encode(["status" => "success", "products" => $products]);
}

//  ดึงออเดอร์ลูกค้า 
elseif ($action == 'get_my_orders') {
    $customer_id = $_GET['customer_id'];
    $sql = "SELECT o.*, s.shop_name, s.image as shop_image FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.customer_id = '$customer_id' ORDER BY o.id DESC";
    $result = $conn->query($sql);
    
    $orders = [];
    while($row = $result->fetch_assoc()) {
        $oid = $row['id'];
        $items_res = $conn->query("SELECT * FROM order_items WHERE order_id = '$oid'");
        $items = [];
        while($item = $items_res->fetch_assoc()) { 
            $item['selected_options'] = json_decode($item['selected_options']);
            $items[] = $item; 
        }
        $row['items'] = $items;
        $orders[] = $row;
    }
    echo json_encode(["status" => "success", "orders" => $orders]);
}

//  ดึงออเดอร์ร้านค้า 
elseif ($action == 'get_shop_orders') {
    $shop_id = $_GET['shop_id'];
    $type = $_GET['type'];
    $where_status = ($type == 'history') ? "status IN ('completed', 'cancelled')" : "status NOT IN ('completed', 'cancelled')";
    $sql = "SELECT o.*, u.fullname as customer_name, u.phone as customer_phone FROM orders o JOIN users u ON o.customer_id = u.id WHERE o.shop_id = '$shop_id' AND $where_status ORDER BY o.id DESC";
    $result = $conn->query($sql);
    $orders = [];
    while($row = $result->fetch_assoc()) {
        $oid = $row['id'];
        $items_res = $conn->query("SELECT * FROM order_items WHERE order_id = '$oid'");
        $items = [];
        while($item = $items_res->fetch_assoc()) { 
            $item['selected_options'] = json_decode($item['selected_options']);
            $items[] = $item; 
        }
        $row['items'] = $items;
        $orders[] = $row;
    }
    echo json_encode(["status" => "success", "orders" => $orders]);
}

//  อัปเดตสถานะ 
elseif ($action == 'update_status') {
    $order_id = $data->order_id;
    $status = $data->status;
    $conn->query("UPDATE orders SET status = '$status' WHERE id = '$order_id'");
    echo json_encode(["status" => "success"]);
}



//  (ใหม่) ปิดการแจ้งเตือนออเดอร์ เมื่อลูกค้ากด X
elseif ($action == 'close_notification') {
    $order_id = $data->order_id;
    $conn->query("UPDATE orders SET is_closed_notif = 1 WHERE id = '$order_id'");
    echo json_encode(["status" => "success"]);
}
?>
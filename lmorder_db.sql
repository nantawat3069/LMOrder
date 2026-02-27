-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 26, 2026 at 01:38 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lmorder_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `addresses`
--

CREATE TABLE `addresses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `address_text` text NOT NULL,
  `contact_phone` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `addresses`
--

INSERT INTO `addresses` (`id`, `user_id`, `address_text`, `contact_phone`) VALUES
(2, 1, 'อยู่ในใจต้าเสมอ ซอย4', '231544'),
(3, 1, 'หอพักริมน้ำ26', '064151'),
(4, 2, 'ริมน้ำ', '52626241'),
(5, 3, 'หอสิน', '4065515');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `address` text NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `status` enum('pending','accepted','cooking','delivering','completed','cancelled') DEFAULT 'pending',
  `order_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_closed_notif` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `customer_id`, `shop_id`, `total_price`, `address`, `payment_method`, `status`, `order_time`, `is_closed_notif`) VALUES
(1, 2, 1, 100.00, 'หอพักริมน้ำ 08448884488', 'เงินสด (COD)', 'completed', '2026-01-13 15:56:31', 1),
(2, 2, 1, 150.00, 'กกฟหกฟก 0055151', 'เงินสด (COD)', 'completed', '2026-01-13 15:57:19', 1),
(3, 2, 1, 100.00, 'asdasddfffqwf', 'เงินสด (COD)', 'cancelled', '2026-01-13 16:24:08', 1),
(4, 2, 1, 50.00, 'หฟกฟหก 515130', 'เงินสด (COD)', 'completed', '2026-01-13 16:30:58', 1),
(5, 2, 1, 330.00, 'คอนโดพรี๊ปื๊ด', 'เงินสด (COD)', 'completed', '2026-01-13 16:39:23', 1),
(6, 2, 1, 50.00, 'asdasdasfasfasf', 'เงินสด (COD)', 'completed', '2026-01-13 16:57:08', 1),
(7, 2, 1, 50.00, 'asdsasdasdasd', 'โอนเงิน (Mobile Banking)', 'completed', '2026-01-13 17:08:08', 1),
(8, 1, 1, 50.00, 'ไม่บอก', 'เงินสด (COD)', 'completed', '2026-01-14 07:01:00', 0),
(9, 1, 1, 230.00, 'ไม่บอก', 'เงินสด (COD)', 'completed', '2026-01-14 07:04:21', 0),
(10, 1, 1, 50.00, 'ไม่บอก', 'เงินสด (COD)', 'completed', '2026-01-14 07:10:26', 0),
(11, 1, 1, 50.00, 'ไม่บอก', 'เงินสด (COD)', 'cancelled', '2026-01-14 07:11:09', 0),
(12, 1, 1, 150.00, 'ไม่บอก', 'เงินสด (COD)', 'completed', '2026-01-14 07:56:42', 0),
(13, 1, 1, 50.00, 'ไม่บอก', 'เงินสด (COD)', 'completed', '2026-01-14 08:00:38', 0),
(14, 1, 1, 60.00, 'ไม่ บอก เขิล', 'เงินสด (COD)', 'cancelled', '2026-01-14 14:11:47', 0),
(15, 1, 1, 50.00, 'ฟกฟหก', 'เงินสด (COD)', 'completed', '2026-01-14 14:30:11', 0),
(16, 2, 1, 50.00, 'sadasdasfewgverwgregrgrgrgsadasdasfewgverwgregrgrgrgsadasdasfewgverwgregrgrgrgsadasdasfewgverwgregrgrgrgsadasdasfewgverwgregrgrgrgsadasdasfewgverwgregrgrgrg', 'เงินสด (COD)', 'completed', '2026-01-14 14:41:55', 1),
(17, 2, 1, 50.00, 'sa', 'เงินสด (COD)', 'cancelled', '2026-01-14 14:55:42', 1),
(18, 2, 1, 50.00, 'sa', 'เงินสด (COD)', 'cancelled', '2026-01-14 14:56:19', 1),
(19, 1, 1, 90.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'cancelled', '2026-01-14 16:31:51', 0),
(20, 1, 1, 50.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'completed', '2026-01-14 16:34:13', 0),
(21, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'completed', '2026-01-14 16:57:47', 1),
(22, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'completed', '2026-01-14 17:01:37', 1),
(23, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'completed', '2026-01-15 06:34:06', 1),
(24, 3, 1, 50.00, 'หอสิน (ติดต่อ: 4065515)', 'เงินสด (COD)', 'completed', '2026-01-15 06:34:38', 1),
(25, 1, 1, 50.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'completed', '2026-01-15 07:32:23', 0),
(26, 1, 1, 50.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'completed', '2026-01-15 07:33:22', 0),
(27, 1, 1, 30.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'completed', '2026-01-15 07:33:34', 0),
(28, 1, 1, 30.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'completed', '2026-01-15 07:42:54', 0),
(29, 1, 1, 50.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'cancelled', '2026-01-15 07:49:01', 0),
(30, 1, 1, 50.00, 'หอพักริมน้ำ26 (ติดต่อ: 064151)', 'เงินสด (COD)', 'cancelled', '2026-01-15 07:49:15', 0),
(31, 1, 1, 40.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'completed', '2026-01-15 07:56:58', 0),
(32, 1, 1, 50.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'cancelled', '2026-01-15 07:57:49', 0),
(33, 1, 1, 50.00, 'อยู่ในใจต้าเสมอ ซอย4 (ติดต่อ: 231544)', 'เงินสด (COD)', 'cancelled', '2026-01-15 08:07:35', 0),
(34, 2, 1, 45.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'โอนเงิน', 'cancelled', '2026-01-15 12:04:58', 1),
(35, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'cancelled', '2026-01-15 12:14:21', 1),
(36, 2, 1, 100.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'completed', '2026-01-25 10:03:54', 1),
(37, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'โอนเงิน', 'completed', '2026-02-02 10:54:40', 1),
(38, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'cancelled', '2026-02-02 10:56:26', 1),
(39, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'cancelled', '2026-02-02 10:56:38', 1),
(40, 2, 1, 30.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'cancelled', '2026-02-02 11:00:41', 1),
(41, 2, 1, 50.00, 'ริมน้ำ (ติดต่อ: 52626241)', 'เงินสด (COD)', 'cancelled', '2026-02-05 19:10:32', 1);

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `note` text DEFAULT NULL,
  `selected_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`selected_options`)),
  `special_instruction` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `price`, `quantity`, `note`, `selected_options`, `special_instruction`) VALUES
(1, 1, 2, 'ข้าวกระเพรา (หมู)', 50.00, 2, NULL, NULL, NULL),
(2, 2, 2, 'ข้าวกระเพรา (หมู)', 50.00, 3, NULL, NULL, NULL),
(3, 3, 2, 'ข้าวกระเพรา (หมู)', 50.00, 2, NULL, NULL, NULL),
(4, 4, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, NULL, NULL),
(5, 5, 2, 'ข้าวกระเพรา (หมู)', 50.00, 3, NULL, NULL, NULL),
(6, 5, 3, 'PeemTi', 60.00, 3, NULL, NULL, NULL),
(7, 6, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, NULL, NULL),
(8, 7, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, NULL, NULL),
(9, 8, 6, 'ก๋วยเตี๋ยว', 50.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e2a\\u0e49\\u0e19\",\"name\":\"\\u0e40\\u0e2a\\u0e49\\u0e19\\u0e40\\u0e25\\u0e47\\u0e01\",\"price\":0},{\"group\":\"\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e17\\u0e47\\u0e2d\\u0e1b\\u0e1b\\u0e34\\u0e49\\u0e07\",\"name\":\"\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e25\\u0e39\\u0e01\\u0e0a\\u0e34\\u0e49\\u0e19\",\"price\":\"10\"},{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e23\\u0e30\\u0e14\\u0e31\\u0e1a\\u0e04\\u0e27\\u0e32\\u0e21\\u0e40\\u0e1c\\u0e47\\u0e14\",\"name\":\"\\u0e40\\u0e1c\\u0e47\\u0e14\\u0e19\\u0e49\\u0e2d\\u0e22\",\"price\":0}]', ''),
(10, 9, 7, 'ต้มแซ่บ', 30.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e19\\u0e37\\u0e49\\u0e2d\",\"name\":\"\\u0e2b\\u0e21\\u0e32\",\"price\":0}]', ''),
(11, 9, 8, 'ไม่มีไร', 100.00, 1, NULL, '[]', ''),
(12, 9, 8, 'ไม่มีไร', 100.00, 1, NULL, '[]', 'ไม่กิน'),
(13, 10, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(14, 11, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(15, 12, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(16, 12, 8, 'ไม่มีไร', 100.00, 1, NULL, '[]', ''),
(17, 13, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(18, 14, 7, 'ต้มแซ่บ', 30.00, 2, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e19\\u0e37\\u0e49\\u0e2d\",\"name\":\"\\u0e01\\u0e1a\",\"price\":0}]', ''),
(19, 15, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(20, 16, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(21, 17, 8, 'ไม่มีไร', 50.00, 1, NULL, '[]', ''),
(22, 18, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(23, 19, 6, 'ก๋วยเตี๋ยว', 40.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e2a\\u0e49\\u0e19\",\"name\":\"\\u0e40\\u0e2a\\u0e49\\u0e19\\u0e40\\u0e25\\u0e47\\u0e01\",\"price\":0},{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e23\\u0e30\\u0e14\\u0e31\\u0e1a\\u0e04\\u0e27\\u0e32\\u0e21\\u0e40\\u0e1c\\u0e47\\u0e14\",\"name\":\"\\u0e40\\u0e1c\\u0e47\\u0e14\\u0e01\\u0e25\\u0e32\\u0e07\",\"price\":0}]', 'ไม่ผัก'),
(24, 19, 8, 'Pepe', 50.00, 1, NULL, '[]', 'ไม่สุก'),
(25, 20, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(26, 21, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(27, 22, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(28, 23, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(29, 24, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(30, 25, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(31, 26, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(32, 27, 7, 'ต้มแซ่บ', 30.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e19\\u0e37\\u0e49\\u0e2d\",\"name\":\"\\u0e01\\u0e1a\",\"price\":0}]', ''),
(33, 28, 7, 'ต้มแซ่บ', 30.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e19\\u0e37\\u0e49\\u0e2d\",\"name\":\"\\u0e2b\\u0e21\\u0e32\",\"price\":0}]', ''),
(34, 29, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(35, 30, 6, 'ก๋วยเตี๋ยว', 50.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e2a\\u0e49\\u0e19\",\"name\":\"\\u0e40\\u0e2a\\u0e49\\u0e19\\u0e40\\u0e25\\u0e47\\u0e01\",\"price\":0},{\"group\":\"\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e17\\u0e47\\u0e2d\\u0e1b\\u0e1b\\u0e34\\u0e49\\u0e07\",\"name\":\"\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e25\\u0e39\\u0e01\\u0e0a\\u0e34\\u0e49\\u0e19\",\"price\":\"10\"},{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e23\\u0e30\\u0e14\\u0e31\\u0e1a\\u0e04\\u0e27\\u0e32\\u0e21\\u0e40\\u0e1c\\u0e47\\u0e14\",\"name\":\"\\u0e40\\u0e1c\\u0e47\\u0e14\\u0e21\\u0e32\\u0e01\",\"price\":0}]', ''),
(36, 31, 6, 'ก๋วยเตี๋ยว', 40.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e2a\\u0e49\\u0e19\",\"name\":\"\\u0e40\\u0e2a\\u0e49\\u0e19\\u0e2b\\u0e21\\u0e35\\u0e48\",\"price\":0},{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e23\\u0e30\\u0e14\\u0e31\\u0e1a\\u0e04\\u0e27\\u0e32\\u0e21\\u0e40\\u0e1c\\u0e47\\u0e14\",\"name\":\"\\u0e40\\u0e1c\\u0e47\\u0e14\\u0e19\\u0e49\\u0e2d\\u0e22\",\"price\":0}]', 'ไม่ผัก'),
(37, 32, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(38, 33, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(39, 34, 6, 'ก๋วยเตี๋ยว', 45.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e2a\\u0e49\\u0e19\",\"name\":\"\\u0e40\\u0e2a\\u0e49\\u0e19\\u0e40\\u0e25\\u0e47\\u0e01\",\"price\":0},{\"group\":\"\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e17\\u0e47\\u0e2d\\u0e1b\\u0e1b\\u0e34\\u0e49\\u0e07\",\"name\":\"\\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e40\\u0e01\\u0e35\\u0e4b\\u0e22\\u0e27\",\"price\":\"5\"},{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e23\\u0e30\\u0e14\\u0e31\\u0e1a\\u0e04\\u0e27\\u0e32\\u0e21\\u0e40\\u0e1c\\u0e47\\u0e14\",\"name\":\"\\u0e40\\u0e1c\\u0e47\\u0e14\\u0e19\\u0e49\\u0e2d\\u0e22\",\"price\":0}]', ''),
(40, 35, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(41, 36, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(42, 36, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(43, 37, 7, 'ต้มแซ่บ', 30.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e19\\u0e37\\u0e49\\u0e2d\",\"name\":\"\\u0e01\\u0e1a\",\"price\":0}]', ''),
(44, 37, 10, 'ลาบ', 20.00, 1, NULL, '[]', 'โหด'),
(45, 38, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(46, 39, 2, 'ข้าวกระเพรา (หมู)', 50.00, 1, NULL, '[]', ''),
(47, 40, 7, 'ต้มแซ่บ', 30.00, 1, NULL, '[{\"group\":\"\\u0e40\\u0e25\\u0e37\\u0e2d\\u0e01\\u0e40\\u0e19\\u0e37\\u0e49\\u0e2d\",\"name\":\"\\u0e2b\\u0e21\\u0e32\",\"price\":0}]', ''),
(48, 41, 8, 'Pepe', 50.00, 1, NULL, '[]', '');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `shop_id`, `name`, `price`, `image`, `is_available`, `options`) VALUES
(2, 1, 'ข้าวกระเพรา (หมู)', 50.00, 'menu_1768318336.png', 1, NULL),
(6, 1, 'ก๋วยเตี๋ยว', 40.00, 'menu_1768372525.png', 1, '[{\"name\":\"เลือกเส้น\",\"type\":\"radio\",\"choices\":[{\"name\":\"เส้นเล็ก\",\"price\":0},{\"name\":\"เส้นหมี่\",\"price\":0},{\"name\":\"เส้นมาม่า\",\"price\":0}]},{\"name\":\"เพิ่มท็อปปิ้ง\",\"type\":\"checkbox\",\"choices\":[{\"name\":\"เพิ่มลูกชิ้น\",\"price\":\"10\"},{\"name\":\"เพิ่มเกี๋ยว\",\"price\":\"5\"}]},{\"name\":\"เลือกระดับความเผ็ด\",\"type\":\"radio\",\"choices\":[{\"name\":\"เผ็ดน้อย\",\"price\":0},{\"name\":\"เผ็ดกลาง\",\"price\":0},{\"name\":\"เผ็ดมาก\",\"price\":0}]}]'),
(7, 1, 'ต้มแซ่บ', 30.00, 'menu_1768373834.png', 1, '[{\"name\":\"เลือกเนื้อ\",\"type\":\"radio\",\"choices\":[{\"name\":\"หมา\",\"price\":0},{\"name\":\"กบ\",\"price\":0}]}]'),
(8, 1, 'Pepe', 50.00, 'menu_1768373857.png', 1, '[]');

-- --------------------------------------------------------

--
-- Table structure for table `shops`
--

CREATE TABLE `shops` (
  `id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `shop_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_open` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shops`
--

INSERT INTO `shops` (`id`, `owner_id`, `shop_name`, `description`, `address`, `image`, `is_open`) VALUES
(1, 1, 'ร้านค้าไม่บอก', 'เปิดทุกวันจันทร์ - ศุกร์ เวลา 8:00น - 17:00น', 'อยู่ไหนก็ได้โตแล้ว', 'shop_1_1768463788.png', 1),
(2, 4, 'ร้านของ Gilismo', NULL, NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('customer','merchant') NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `fullname`, `phone`, `created_at`) VALUES
(1, 'admin1', '$2y$10$VOEbOSV3lGAT1lURJYk.5.WBm6NuZe1mWsEBkjtg8vKB4jmTNjX12', 'merchant', 'โม่ขี้โม้ เยสม้า', '123456666', '2026-01-13 15:16:45'),
(2, 'admin2', '$2y$10$.NJMxc56cjMZUNi9qJfkxezhmHg0.iMjbfhuofRNKR7/GPlarpet6', 'customer', 'ธนโชติ', '525151', '2026-01-13 15:25:04'),
(3, 'admin3', '$2y$10$fDbDkt/zYjvrOGGkL2fhLuM2Z5KPD6kkQr14WceYj5.MPPBCI7UxK', 'customer', 'ชนาธิป โกศลจิตร', '4062616231', '2026-01-14 14:33:44'),
(4, 'admin4', '$2y$10$pfNrZGANSZIFJD6XeCvMGu6zexjmBtD.dFXYJ.HAEqeXqwPLoOkHW', 'merchant', 'Gilismo', '0612415415', '2026-01-15 06:32:08');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `shop_id` (`shop_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shop_id` (`shop_id`);

--
-- Indexes for table `shops`
--
ALTER TABLE `shops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `addresses`
--
ALTER TABLE `addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `shops`
--
ALTER TABLE `shops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shops`
--
ALTER TABLE `shops`
  ADD CONSTRAINT `shops_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

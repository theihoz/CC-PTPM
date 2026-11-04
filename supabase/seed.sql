-- ============================================================================
-- Dữ liệu mẫu cho thực đơn. FILE SINH TỰ ĐỘNG, đừng sửa tay.
-- Nguồn: src/data/menuSeed.js · Sinh lại: npm run db:seed
-- ----------------------------------------------------------------------------
-- Chạy trong Supabase SQL Editor SAU migration thực đơn.
-- Xóa sạch dữ liệu thực đơn cũ rồi nạp lại, nên chạy lại nhiều lần vẫn an toàn.
-- 6 danh mục · 7 quán · 41 món · 36 size · 37 topping
-- ============================================================================

begin;

truncate public.food_toppings, public.food_sizes, public.foods, public.restaurants, public.categories
  restart identity cascade;

insert into public.categories (id, slug, name, icon, sort_order) overriding system value values
  (1, 'bun-pho', 'Bún & Phở', '🍜', 1),
  (2, 'com', 'Cơm', '🍚', 2),
  (3, 'fast-food', 'Burger & Pizza', '🍔', 3),
  (4, 'healthy', 'Healthy & Chay', '🥗', 4),
  (5, 'do-uong', 'Trà sữa & Cà phê', '🧋', 5),
  (6, 'trang-mieng', 'Tráng miệng', '🍰', 6)
;
select setval(pg_get_serial_sequence('public.categories', 'id'), (select max(id) from public.categories));

insert into public.restaurants (id, slug, name, description, image_url, address, category_id, rating, rating_count, delivery_time_min, open_time, close_time, is_featured) overriding system value values
  (1, 'pho-ha-thanh', 'Phở Hà Thành', 'Phở bò, bún bò Huế nấu nước dùng xương ninh 12 tiếng.', 'https://images.unsplash.com/photo-1576577445504-6af96477db52', '25 Lý Thường Kiệt, Quận 10, TP.HCM', 1, 4.8, 1240, 25, '06:00', '22:00', true),
  (2, 'com-tam-sai-gon', 'Cơm Tấm Sài Gòn', 'Cơm tấm sườn nướng than hoa, cơm gà và các món cơm nhà.', 'https://images.unsplash.com/photo-1559847844-5315695dadae', '102 Nguyễn Trãi, Quận 1, TP.HCM', 2, 4.6, 860, 30, '06:30', '21:30', false),
  (3, 'burger-house', 'Burger House', 'Burger bò Úc, gà rán giòn cay và khoai tây chiên.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd', '8 Phạm Ngọc Thạch, Quận 3, TP.HCM', 3, 4.5, 2310, 20, '10:00', '23:00', true),
  (4, 'green-bowl', 'Green Bowl', 'Salad, poke bowl và món chay ít calo cho người ăn lành mạnh.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', '41 Thảo Điền, TP. Thủ Đức, TP.HCM', 4, 4.7, 540, 35, '07:00', '21:00', true),
  (5, 'tra-sua-may', 'Trà Sữa Mây', 'Trà sữa trân châu nấu mỗi giờ, cà phê pha phin và trà trái cây.', 'https://images.unsplash.com/photo-1558857563-b371033873b8', '210 Võ Văn Tần, Quận 3, TP.HCM', 5, 4.4, 3120, 15, '08:00', '23:30', false),
  (6, 'sweet-corner', 'Sweet Corner', 'Bánh kem, kem và bánh ngọt làm trong ngày.', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187', '15 Trần Quang Khải, Quận 1, TP.HCM', 6, 4.9, 410, 25, '09:00', '22:00', false),
  (7, 'pizza-bon-mua', 'Pizza Bốn Mùa', 'Pizza đế mỏng nướng lò củi và mì Ý sốt nhà làm.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38', '77 Hai Bà Trưng, Quận 1, TP.HCM', 3, 4.6, 980, 35, '10:30', '00:30', true)
;
select setval(pg_get_serial_sequence('public.restaurants', 'id'), (select max(id) from public.restaurants));

insert into public.foods (id, restaurant_id, category_id, name, description, image_url, base_price, calories, tags, stock, has_spice, is_featured, is_available, sort_order) overriding system value values
  (1, 1, 1, 'Phở bò tái', 'Bánh phở tươi, thịt bò tái mềm, nước dùng trong và ngọt xương.', 'https://images.unsplash.com/photo-1576577445504-6af96477db52', 55000, 450, array['giau-dam', 'no-lau']::text[], 30, true, true, true, 1),
  (2, 1, 1, 'Bún bò Huế', 'Sợi bún to, nước dùng sả ruốc cay nồng đặc trưng xứ Huế.', 'https://images.unsplash.com/photo-1503764654157-72d979d9af2f', 60000, 520, array['cay', 'no-lau', 'giau-dam']::text[], 3, true, true, true, 2),
  (3, 1, 1, 'Phở gà', 'Gà ta xé, hành lá, nước dùng thanh nhẹ.', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43', 50000, 400, array['nhe-bung']::text[], 25, true, false, true, 3),
  (4, 1, 1, 'Mì xào giòn hải sản', 'Mì chiên giòn, sốt hải sản tôm mực rau cải.', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841', 65000, 610, array['no-lau']::text[], 0, false, false, true, 4),
  (5, 1, 4, 'Gỏi cuốn tôm thịt (2 cuốn)', 'Bánh tráng cuốn tôm, thịt, bún và rau sống, chấm tương đậu.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb', 35000, 180, array['it-calo', 'nhe-bung']::text[], 20, false, false, true, 5),
  (6, 2, 2, 'Cơm tấm sườn bì chả', 'Sườn cốt lết nướng than, bì, chả trứng, mỡ hành và nước mắm chua ngọt.', 'https://images.unsplash.com/photo-1559847844-5315695dadae', 55000, 750, array['giau-dam', 'no-lau']::text[], 40, false, true, true, 6),
  (7, 2, 2, 'Cơm gà xối mỡ', 'Gà chiên giòn da, cơm chiên nghệ, dưa leo.', 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc', 50000, 680, array['no-lau', 'giau-dam']::text[], 20, true, false, true, 7),
  (8, 2, 2, 'Cơm chiên hải sản', 'Cơm chiên tơi với tôm, mực, trứng và rau củ.', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b', 65000, 620, array['giau-dam']::text[], 15, true, false, true, 8),
  (9, 2, 2, 'Cơm cà ri gà', 'Cà ri gà nước cốt dừa, khoai lang, ăn kèm cơm trắng.', 'https://images.unsplash.com/photo-1574484284002-952d92456975', 60000, 650, array['cay', 'no-lau']::text[], 12, true, false, true, 9),
  (10, 2, 2, 'Canh chua cá lóc', 'Canh chua me, cá lóc, thơm, bạc hà và giá đỗ.', 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd', 45000, 220, array['it-calo', 'nhe-bung']::text[], 10, false, false, true, 10),
  (11, 2, 4, 'Cơm rau củ xào chay', 'Rau củ theo mùa xào nấm, đậu hũ, ăn kèm cơm gạo lứt.', 'https://images.unsplash.com/photo-1512058564366-18510be2db19', 40000, 380, array['chay', 'it-calo']::text[], 18, true, false, true, 11),
  (12, 3, 3, 'Classic Beef Burger', 'Bò Úc xay 150g, phô mai cheddar, xà lách, cà chua, sốt nhà làm.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd', 79000, 680, array['giau-dam', 'no-lau']::text[], 30, false, true, true, 12),
  (13, 3, 3, 'Gà rán giòn cay', 'Gà tẩm bột chiên giòn hai lần, phủ bột ớt cay.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec', 85000, 820, array['cay', 'giau-dam']::text[], 25, true, true, true, 13),
  (14, 3, 3, 'Burger gà giòn', 'Đùi gà chiên giòn, bắp cải trộn, sốt mayonnaise.', 'https://images.unsplash.com/photo-1606755962773-d324e0a13086', 69000, 590, array['giau-dam']::text[], 2, true, false, true, 14),
  (15, 3, 3, 'Khoai tây chiên', 'Khoai tây cắt sợi chiên giòn, rắc muối biển.', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877', 35000, 360, array['chay']::text[], 50, false, false, true, 15),
  (16, 3, 3, 'Cánh gà sốt cay Hàn Quốc', 'Cánh gà chiên phủ sốt gochujang cay ngọt, mè rang.', 'https://images.unsplash.com/photo-1562967914-608f82629710', 75000, 540, array['cay']::text[], 14, true, false, true, 16),
  (17, 3, 3, 'Combo burger & khoai', 'Classic Beef Burger, khoai tây chiên vừa và nước ngọt.', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5', 109000, 1050, array['no-lau', 'giau-dam']::text[], 10, false, false, true, 17),
  (18, 4, 4, 'Salad ức gà nướng', 'Ức gà nướng thảo mộc, rau xanh, cà chua bi, sốt mè rang.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', 69000, 380, array['it-calo', 'giau-dam']::text[], 20, false, true, true, 18),
  (19, 4, 4, 'Poke bowl cá hồi', 'Cá hồi Na Uy, cơm gạo lứt, bơ, dưa leo, rong biển.', 'https://images.unsplash.com/photo-1547592180-85f173990554', 99000, 520, array['giau-dam']::text[], 6, true, true, true, 19),
  (20, 4, 4, 'Buddha bowl chay', 'Đậu gà nướng, khoai lang, quinoa, rau củ và sốt tahini.', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061', 75000, 450, array['chay', 'no-lau']::text[], 12, false, false, true, 20),
  (21, 4, 4, 'Salad rau trộn dầu giấm', 'Rau xà lách, cà chua, dưa leo, hạt hướng dương, dầu giấm táo.', 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af', 49000, 180, array['chay', 'it-calo', 'nhe-bung']::text[], 25, false, false, true, 21),
  (22, 4, 4, 'Súp bí đỏ kem tươi', 'Bí đỏ hầm nhuyễn, kem tươi, hạt bí rang.', 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a', 45000, 210, array['chay', 'it-calo', 'nhe-bung']::text[], 8, false, false, true, 22),
  (23, 4, 5, 'Nước cam ép', 'Cam sành ép tươi, không thêm đường.', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba', 39000, 120, array['it-calo', 'mat-lanh']::text[], 30, false, false, true, 23),
  (24, 4, 6, 'Sữa chua granola', 'Sữa chua Hy Lạp, granola yến mạch, trái cây tươi và mật ong.', 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71', 45000, 260, array['it-calo', 'ngot']::text[], 15, false, false, true, 24),
  (25, 5, 5, 'Trà sữa trân châu đường đen', 'Trà sữa đậm vị, trân châu nấu đường đen dẻo thơm.', 'https://images.unsplash.com/photo-1558857563-b371033873b8', 45000, 420, array['ngot', 'mat-lanh']::text[], 60, false, true, true, 25),
  (26, 5, 5, 'Cà phê sữa đá', 'Cà phê Robusta pha phin, sữa đặc, đá viên.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735', 29000, 180, array['mat-lanh']::text[], 80, false, false, true, 26),
  (27, 5, 5, 'Bạc xỉu nóng', 'Nhiều sữa, ít cà phê, thơm béo dễ uống.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', 32000, 200, array['ngot']::text[], 40, false, false, true, 27),
  (28, 5, 5, 'Cappuccino', 'Espresso, sữa tươi đánh bọt mịn, rắc bột quế.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93', 45000, 150, array[]::text[], 35, false, false, true, 28),
  (29, 5, 5, 'Trà đào cam sả', 'Trà đen ủ lạnh, đào ngâm, cam tươi và sả.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc', 39000, 140, array['it-calo', 'mat-lanh']::text[], 45, false, false, true, 29),
  (30, 5, 5, 'Trà hoa cúc mật ong', 'Trà hoa cúc nóng, mật ong rừng, giúp thư giãn.', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f', 29000, 40, array['it-calo', 'nhe-bung']::text[], 0, false, false, true, 30),
  (31, 6, 6, 'Bánh kem dâu tây', 'Bánh bông lan, kem tươi và dâu tây Đà Lạt.', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187', 55000, 380, array['ngot']::text[], 4, false, true, true, 31),
  (32, 6, 6, 'Kem ốc quế vani', 'Kem vani Madagascar trong ốc quế giòn.', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f', 25000, 210, array['ngot', 'mat-lanh']::text[], 50, false, false, true, 32),
  (33, 6, 6, 'Sundae socola', 'Kem socola, bánh brownie, sốt socola nóng và hạt.', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb', 45000, 420, array['ngot', 'mat-lanh']::text[], 20, false, false, true, 33),
  (34, 6, 6, 'Bánh donut socola', 'Donut chiên mềm, phủ socola và cốm màu.', 'https://images.unsplash.com/photo-1551024601-bec78aea704b', 30000, 300, array['ngot']::text[], 24, false, false, true, 34),
  (35, 6, 6, 'Bánh quy socola chip (3 cái)', 'Bánh quy bơ giòn rìa, mềm giữa, nhiều socola chip.', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35', 35000, 330, array['ngot']::text[], 30, false, false, true, 35),
  (36, 6, 6, 'Pancake mật ong', 'Ba lớp pancake, bơ, mật ong và việt quất.', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445', 55000, 480, array['ngot', 'no-lau']::text[], 12, false, false, true, 36),
  (37, 7, 3, 'Pizza hải sản', 'Tôm, mực, nghêu, phô mai mozzarella, sốt cà chua.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38', 159000, 1100, array['giau-dam', 'no-lau']::text[], 15, false, true, true, 37),
  (38, 7, 3, 'Pizza pepperoni cay', 'Xúc xích pepperoni, ớt jalapeño, phô mai kéo sợi.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591', 149000, 1200, array['cay', 'no-lau']::text[], 15, true, false, true, 38),
  (39, 7, 3, 'Mì Ý sốt bò bằm', 'Spaghetti sốt bò bằm cà chua, phô mai Parmesan.', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9', 89000, 690, array['no-lau']::text[], 20, false, false, true, 39),
  (40, 7, 3, 'Mì Ý hải sản cay', 'Linguine xào tôm, mực, tỏi ớt và dầu ô liu.', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8', 109000, 720, array['giau-dam', 'cay']::text[], 10, true, false, true, 40),
  (41, 7, 4, 'Salad Caesar', 'Xà lách romaine, bánh mì nướng, phô mai Parmesan, sốt Caesar.', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe', 69000, 330, array['it-calo']::text[], 18, false, false, true, 41)
;
select setval(pg_get_serial_sequence('public.foods', 'id'), (select max(id) from public.foods));

insert into public.food_sizes (id, food_id, name, price_delta, is_default, sort_order) overriding system value values
  (1, 1, 'Thường', 0, true, 1),
  (2, 1, 'Lớn', 15000, false, 2),
  (3, 2, 'Thường', 0, true, 1),
  (4, 2, 'Đặc biệt', 20000, false, 2),
  (5, 3, 'Thường', 0, true, 1),
  (6, 3, 'Lớn', 12000, false, 2),
  (7, 6, 'Thường', 0, true, 1),
  (8, 6, 'Thêm cơm', 5000, false, 2),
  (9, 8, 'Thường', 0, true, 1),
  (10, 8, 'Lớn', 15000, false, 2),
  (11, 12, 'Một lớp bò', 0, true, 1),
  (12, 12, 'Hai lớp bò', 30000, false, 2),
  (13, 13, '3 miếng', 0, true, 1),
  (14, 13, '5 miếng', 45000, false, 2),
  (15, 15, 'Vừa', 0, true, 1),
  (16, 15, 'Lớn', 10000, false, 2),
  (17, 16, '6 cánh', 0, true, 1),
  (18, 16, '10 cánh', 45000, false, 2),
  (19, 19, 'Thường', 0, true, 1),
  (20, 19, 'Lớn', 30000, false, 2),
  (21, 23, 'Size M', 0, true, 1),
  (22, 23, 'Size L', 10000, false, 2),
  (23, 25, 'Size M', 0, true, 1),
  (24, 25, 'Size L', 8000, false, 2),
  (25, 26, 'Size M', 0, true, 1),
  (26, 26, 'Size L', 6000, false, 2),
  (27, 28, 'Size M', 0, true, 1),
  (28, 28, 'Size L', 8000, false, 2),
  (29, 29, 'Size M', 0, true, 1),
  (30, 29, 'Size L', 8000, false, 2),
  (31, 34, '1 cái', 0, true, 1),
  (32, 34, 'Hộp 3 cái', 50000, false, 2),
  (33, 37, '20 cm', 0, true, 1),
  (34, 37, '28 cm', 60000, false, 2),
  (35, 38, '20 cm', 0, true, 1),
  (36, 38, '28 cm', 60000, false, 2)
;
select setval(pg_get_serial_sequence('public.food_sizes', 'id'), (select max(id) from public.food_sizes));

insert into public.food_toppings (id, food_id, name, price, sort_order) overriding system value values
  (1, 1, 'Thêm bò tái', 15000, 1),
  (2, 1, 'Trứng chần', 7000, 2),
  (3, 1, 'Quẩy', 5000, 3),
  (4, 2, 'Chả cua', 15000, 1),
  (5, 2, 'Giò heo', 20000, 2),
  (6, 2, 'Huyết', 5000, 3),
  (7, 3, 'Thêm gà', 15000, 1),
  (8, 3, 'Trứng non', 10000, 2),
  (9, 6, 'Trứng ốp la', 7000, 1),
  (10, 6, 'Thêm sườn', 25000, 2),
  (11, 6, 'Chả trứng', 10000, 3),
  (12, 7, 'Thêm đùi gà', 20000, 1),
  (13, 9, 'Bánh mì', 5000, 1),
  (14, 12, 'Thêm phô mai', 10000, 1),
  (15, 12, 'Bacon', 15000, 2),
  (16, 12, 'Trứng ốp la', 8000, 3),
  (17, 13, 'Sốt phô mai', 10000, 1),
  (18, 13, 'Khoai tây chiên', 25000, 2),
  (19, 14, 'Thêm phô mai', 10000, 1),
  (20, 15, 'Phô mai lắc', 8000, 1),
  (21, 18, 'Trứng luộc', 8000, 1),
  (22, 18, 'Bơ', 15000, 2),
  (23, 19, 'Thêm cá hồi', 35000, 1),
  (24, 19, 'Trứng cá', 20000, 2),
  (25, 25, 'Trân châu đen', 8000, 1),
  (26, 25, 'Thạch phô mai', 10000, 2),
  (27, 25, 'Pudding trứng', 10000, 3),
  (28, 25, 'Kem cheese', 12000, 4),
  (29, 26, 'Thêm shot cà phê', 10000, 1),
  (30, 29, 'Thêm đào miếng', 8000, 1),
  (31, 32, 'Sốt socola', 5000, 1),
  (32, 32, 'Hạt hạnh nhân', 7000, 2),
  (33, 36, 'Thêm kem vani', 12000, 1),
  (34, 37, 'Thêm phô mai', 20000, 1),
  (35, 37, 'Viền phô mai', 30000, 2),
  (36, 38, 'Thêm phô mai', 20000, 1),
  (37, 41, 'Thêm gà nướng', 25000, 1)
;
select setval(pg_get_serial_sequence('public.food_toppings', 'id'), (select max(id) from public.food_toppings));

commit;

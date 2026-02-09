-- Command History Seed
DO $$
DECLARE
    u_rec RECORD;
    i INT;
    commands TEXT[] := ARRAY[
        'SELECT * FROM products WHERE quantity < 10',
        'UPDATE product_warehouse SET stock = stock + 50 WHERE w_id = 1 AND pid = 10',
        'INSERT INTO orders (p_id, sup_id, target_w_id, quantity, price, status) VALUES (5, 2, 1, 100, 50000, ''pending'')',
        'DELETE FROM transactions WHERE t_id = 45',
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ''public''',
        'UPDATE employees SET role_id = 1 WHERE e_id = ''e761623b-0000-0000-0000-000000000001''',
        'SELECT SUM(stock * unit_price) FROM products JOIN product_warehouse ON products.pid = product_warehouse.pid WHERE w_id = 2',
        'INSERT INTO product_warehouse (pid, w_id, stock) VALUES (12, 3, 25) ON CONFLICT (pid, w_id) DO UPDATE SET stock = product_warehouse.stock + 25'
    ];
BEGIN
    FOR u_rec IN SELECT id FROM auth.users LIMIT 10 LOOP
        FOR i IN 1..15 LOOP
            INSERT INTO command_history (user_id, command, result, success, created_at)
            VALUES (
                u_rec.id,
                commands[1 + floor(random() * array_length(commands, 1))::int],
                jsonb_build_object('rows_affected', floor(random() * 10)::int, 'timestamp', now()),
                (random() > 0.1), -- 90% success rate
                now() - (floor(random() * 30) || ' days')::interval
            );
        END LOOP;
    END LOOP;
END $$;

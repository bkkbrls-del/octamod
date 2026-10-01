ALTER TABLE configurations ADD COLUMN keep_stock_fx2 INTEGER NOT NULL DEFAULT 1 CHECK(keep_stock_fx2 IN (0,1));

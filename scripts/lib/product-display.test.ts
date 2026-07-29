import assert from "assert/strict";
import {
  DEFAULT_COLUMNS,
  MAX_IMAGES_PER_PRODUCT,
  STOCK_STATUS_OPTIONS,
} from "../../src/lib/constants";
import { formatRoundedPrice } from "../../src/lib/utils";

assert.equal(formatRoundedPrice("168.49"), "¥168");
assert.equal(formatRoundedPrice("168.50"), "¥169");
assert.equal(formatRoundedPrice("¥1,234.6"), "¥1235");
assert.equal(formatRoundedPrice("待定"), "待定");
assert.equal(formatRoundedPrice("22.0/包"), "22.0/包");
assert.equal(formatRoundedPrice(null), "-");

assert.equal(MAX_IMAGES_PER_PRODUCT, 12);
assert.deepEqual(STOCK_STATUS_OPTIONS, ["现货", "期货"]);
assert.ok(DEFAULT_COLUMNS.includes("期货/现货"));
assert.ok(DEFAULT_COLUMNS.includes("上架时间"));

console.log("product display test passed");

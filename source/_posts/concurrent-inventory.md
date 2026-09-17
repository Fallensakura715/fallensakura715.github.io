---
title: 并发下库存预占与扣减的问题
date: 2026-09-11 17:28:50
tags:
  - 后端
  - Java
  - Spring
  - 数据库
categories:
  - 技术
cover: https://imgu.falnsakura.top/PicGo/2026/09/54ad7b4da404bb8dca94e669358385b7.png
---
我翻了翻[这个商城项目](https://github.com/macrozheng/mall)的库存代码，想把它改造成分布式微服务架构。

在分布式场景下，网络请求不能认为是可靠的，这包括请求超时，重复投递，消息乱序等等情况。这个项目的库存扣减防超卖并不是原子的，只维护一个`lock_stock`，无法解决库存预占幂等问题，库存属于哪个订单，取消请求应该释放哪一批库存。

## 原项目的问题

1. 当前的锁库存是这么做的： `lock_stock` +`quantity`，SQL 没有判断剩余的库存，Service 若把 Mapper 的影响行数直接当成“预占成功”，这个返回值只能证明某一行被更新，不能证明库存充足，这非常容易超卖。无论 `stock - lock_stock` 是否足够，只要 SKU 存在，更新都可能成功。
```xml
<update id="updateByPrimaryKeySelective" parameterType="com.macro.mall.model.PmsSkuStock">  
  update pms_sku_stock  
  <set>  
    <if test="productId != null">  
      product_id = #{productId,jdbcType=BIGINT},  
    </if>  
    <if test="skuCode != null">  
      sku_code = #{skuCode,jdbcType=VARCHAR},  
    </if>  
    <if test="price != null">  
      price = #{price,jdbcType=DECIMAL},  
    </if>  
    <if test="stock != null">  
      stock = #{stock,jdbcType=INTEGER},  
    </if>  
    <if test="lowStock != null">  
      low_stock = #{lowStock,jdbcType=INTEGER},  
    </if>  
    <if test="pic != null">  
      pic = #{pic,jdbcType=VARCHAR},  
    </if>  
    <if test="sale != null">  
      sale = #{sale,jdbcType=INTEGER},  
    </if>  
    <if test="promotionPrice != null">  
      promotion_price = #{promotionPrice,jdbcType=DECIMAL},  
    </if>  
    <if test="lockStock != null">  
      lock_stock = #{lockStock,jdbcType=INTEGER},  
    </if>  
    <if test="spData != null">  
      sp_data = #{spData,jdbcType=VARCHAR},  
    </if>  
  </set>  
  where id = #{id,jdbcType=BIGINT}  
</update>
```
2. 锁库存的时候并不能解决并发问题。整个 Java 方法不会自动变成数据库原子操作。假设 `stock = 1`、`lock_stock = 0`，请求 A 和 B 都可能读到 0，并分别把 1 写回数据库。数据库里最终甚至可能仍是 `lock_stock = 1`，但两个订单都收到了成功结果。这是一次丢失更新，库存数字已经无法反映真实的业务归属。如果改成没有条件的 `lock_stock = lock_stock + 1`，结果又会变成 `lock_stock = 2`，同样超过总库存。
```java
private void lockStock(List<CartPromotionItem> cartPromotionItemList) {  
    for (CartPromotionItem cartPromotionItem : cartPromotionItemList) {  
        PmsSkuStock skuStock = skuStockMapper.selectByPrimaryKey(cartPromotionItem.getProductSkuId());  
        skuStock.setLockStock(skuStock.getLockStock() + cartPromotionItem.getQuantity());
        // 如果这时候库存没了，还会继续预扣  
        skuStockMapper.updateByPrimaryKeySelective(skuStock);  
    }  
}
```

```xml
<sql id="Base_Column_List">  
  id, product_id, sku_code, price, stock, low_stock, pic, sale, promotion_price, lock_stock,   
  sp_data  
</sql>
```

```sql
select <include refid="Base_Column_List" /> from pms_sku_stock where id = #{id,jdbcType=BIGINT}
```
3. 没有预占流水记录，只有一个锁定库存数量字段。
 ```sql
 CREATE TABLE `pms_sku_stock` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint DEFAULT NULL,
  `sku_code` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'sku编码',
  `price` decimal(10,2) DEFAULT NULL,
  `stock` int DEFAULT '0' COMMENT '库存',
  `low_stock` int DEFAULT NULL COMMENT '预警库存',
  `pic` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '展示图片',
  `sale` int DEFAULT NULL COMMENT '销量',
  `promotion_price` decimal(10,2) DEFAULT NULL COMMENT '单品促销价格',
  `lock_stock` int DEFAULT '0' COMMENT '锁定库存',
  `sp_data` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL COMMENT '商品销售属性，json格式',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=243 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC COMMENT='sku的库存';
 ```
订单A取消时，只知道要释放两件，但无法确认这两件是否属于订单A，这也会带来幂等问题，订单A的取消请求发了两次，就会增加四件，虚增库存。这也导致无法审计，难以实现超时释放库存。

## 为什么要预占库存

订单业务流程是先下单，再支付/取消，库存会发生变化。如果下单时直接扣库存，取消订单恢复库存的时候不知道扣了多少库存，增加一个预扣字段，就能解决，方便了订单状态管理，这就是预占库存。
而且，下单和支付不是一个瞬时事务。如果不预占，用户下单后库存可能被其他人抢走。

但是，预占库存会带来一些问题：
在秒杀或热门商品场景下，用户下单而不支付，会让很多库存锁定，正常买家无法正常下单。
如果扣库存成功，订单服务挂了，可能出现库存减少但是没有订单的情况。

## 库存原子更新

这个项目目前是单体项目，一条SQL语句的执行是原子的，所以用条件更新即可防止超卖。

```sql
UPDATE ims_sku_stock SET lock_stock = lock_stock + #{quantity}  
WHERE sku_id = #{skuId} AND stock - lock_stock &gt;= #{quantity}
```

InnoDB 执行这条 `UPDATE` 时会对目标库存行加排他锁。并发请求会在这一行上串行，后到的请求会基于更新后的值再次判断条件。因此，“判断库存够不够”和“增加锁定数量”不会被其他事务插入，这一条SQL是原子的。

但是这原子更新就意味着有行锁，秒杀情况下会有大量请求竞争同一行的行锁，库存扣减与数据库交互，性能会受到数据库连接数，IO，锁等等的性能限制。

这条 SQL 解决了超卖，却没有解决幂等。相同请求执行两次，仍会把 `lock_stock` 增加两次。要识别相同请求，库存预占必须有业务身份。

## 库存预占幂等

**幂等**就是**同一个业务**执行很多次，但是业务效果和执行一次相同。前端的防连点更不能替代服务端幂等设计。

原项目有三个库存量：

- `stock`：当前库存总量；
- `lock_stock`：已预占、尚未确认成交的数量；
- `stock - lock_stock`：当前可售数量。

下单时只增加 `lock_stock`。支付成功后，同时减少 `stock` 和 `lock_stock`；订单取消时只减少 `lock_stock`。已经确认成交后的退款或退货属于另一条入库流程，不能再调用预占释放接口。

只增加一个 `lock_stock` 字段仍然不够。它只能表示锁了多少库存，不知道是哪个订单锁的。因此需要一张预占单记录请求和状态，再用预占明细记录每个 SKU 的数量：

还需要设置一个过期字段，再加上扫描主动过期，防止库存被无限占用。

```sql
CREATE TABLE ims_reservation (
    reservation_id VARCHAR(64) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    request_hash CHAR(64),
    state VARCHAR(16) NOT NULL,
    expires_at DATETIME(3) NULL COMMENT '预占过期时间',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_reservation_order(order_id)
) ENGINE=InnoDB;

CREATE TABLE ims_reservation_item (
    reservation_id VARCHAR(64) NOT NULL,
    sku_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY(reservation_id, sku_id)
) ENGINE=InnoDB;
```

`reservation_id` 由订单服务生成。同一个业务请求重试时必须继续使用原 ID，不能每次重试都生成新值。`order_id` 上的唯一索引进一步限制一个订单只能对应一张预占单。

`request_hash` 是发现幂等键被误用。服务先合并重复 SKU、按 `sku_id` 排序，再对订单号和明细计算 SHA-256。同一个 `reservation_id` 如果带着不同商品或数量再次请求，服务会返回参数冲突，而不是把它当成正常重试。

两张预占表属于同一个库存库时可以加外键，但在分库、归档或高并发写入场景中，外键也会增加迁移和写入约束。

## 库存预占与释放

预占单有状态迁移：

| 操作           | 允许的当前状态     | 结果             | 库存变化                                         |
| ------------ | ----------- | -------------- | -------------------------------------------- |
| `reserve`    | `INIT`      | `RESERVED`     | `lock_stock += quantity`                     |
| 重复 `reserve` | `RESERVED`  | 返回 `RESERVED`  | 无                                            |
| `confirm`    | `RESERVED`  | `CONFIRMED`    | `stock -= quantity`，`lock_stock -= quantity` |
| 重复 `confirm` | `CONFIRMED` | 返回 `CONFIRMED` | 无                                            |
| `release`    | `RESERVED`  | `RELEASED`     | `lock_stock -= quantity`                     |
| 重复 `release` | `RELEASED`  | 返回 `RELEASED`  | 无                                            |
`INIT` 是事务内部的中间状态。正常情况下，事务提交后外部只能看到 `RESERVED`；任一 SKU 库存不足时，整个事务回滚，已经增加的其他 SKU 锁定量和预占明细也会一起撤销。

`confirm` 和 `release` 都先执行：

```sql
SELECT order_id, request_hash, state
FROM ims_reservation
WHERE reservation_id = ?
FOR UPDATE;
```

`FOR UPDATE`把同一张预占单上的一行加悲观锁。支付确认和取消同时到达时，只有先拿到行锁的一方能完成终态迁移，另一方会看到新的状态并停止修改库存。

当支付和超时释放请求同时到达，如果业务要求按支付发生时间裁决，就要引入支付时间或订单状态作为额外依据，不能只依赖任务执行先后。

## 超时库存释放

预占成功时写入 `expires_at`，后端定时任务扫描：

```sql
SELECT reservation_id, order_id
FROM ims_reservation
WHERE state = 'RESERVED'
  AND expires_at <= NOW(3)
ORDER BY expires_at
LIMIT 100;
```

任务要逐条调用同一个 `release` 方法。这样人工取消、订单超时和任务重试共用一套幂等逻辑。多个库存服务实例可能同时扫到同一张预占单，但 `SELECT ... FOR UPDATE` 会将释放串行化，后到的实例只会读到 `RELEASED`。

定时任务需要从另一个 Spring Bean 调用 `ReservationService.release`，让调用经过 Spring 事务代理；不要在同一个类里用 `this.release(...)` 自调用。项目还需要启用 `@EnableScheduling`。

扫描任务解决的是库存服务内部的兜底释放。订单服务仍应在订单取消或支付超时时主动发送释放命令，定时扫描只负责处理漏发、延迟和服务故障留下的预占。

扫描时间要根据支付时限和数据库负载调整。

## 代码示例

### 预占库存

`INSERT ... ON DUPLICATE KEY UPDATE` 让重复请求失败，随后再锁定并检查已存在的预占单。多 SKU 请求使用 `TreeMap` 按 `sku_id` 排序，让不同事务尽量以相同顺序锁库存行，从而降低死锁概率。死锁仍可能由其他更新路径引入，生产环境还需要对数据库死锁异常做有限次数重试。

```java
@Transactional
public String reserve(String reservationId, long orderId, List<Line> lines) {
    validateIdentity(reservationId, orderId);
    Map<Long, Integer> quantities = normalize(lines);
    String hash = fingerprint(orderId, quantities);

    jdbc.update("""
            INSERT INTO ims_reservation(
                reservation_id, order_id, request_hash, state, expires_at
            )
            VALUES (?, ?, ?, 'INIT', TIMESTAMPADD(SECOND, ?, NOW(3)))
            ON DUPLICATE KEY UPDATE reservation_id = reservation_id
            """, reservationId, orderId, hash, reservationTtlSeconds);

    Header header = lockedHeader(reservationId, orderId);
    if ("RELEASED".equals(header.state())) {
        throw new ReservationStateException("RESERVATION_ALREADY_RELEASED");
    }
    if (!hash.equals(header.hash())) {
        throw new IllegalArgumentException("IDEMPOTENCY_PARAMETER_CONFLICT");
    }
    if (!"INIT".equals(header.state())) {
        return header.state();
    }

    for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
        int quantity = entry.getValue();
        int updated = jdbc.update("""
                UPDATE pms_sku_stock
                SET lock_stock = lock_stock + ?
                WHERE id = ? AND stock - lock_stock >= ?
                """, quantity, entry.getKey(), quantity);
        if (updated != 1) {
            throw new StockUnavailableException(entry.getKey());
        }

        jdbc.update("""
                INSERT INTO ims_reservation_item(reservation_id, sku_id, quantity)
                VALUES (?, ?, ?)
                """, reservationId, entry.getKey(), quantity);
    }

    jdbc.update("""
            UPDATE ims_reservation
            SET state = 'RESERVED', updated_at = NOW(3)
            WHERE reservation_id = ? AND state = 'INIT'
            """, reservationId);
    return "RESERVED";
}
```

### 支付后确认

确认时同时减少 `stock` 和 `lock_stock`。例如确认前 `stock = 10`、`lock_stock = 2`，可售库存是 8；确认两件后变为 `stock = 8`、`lock_stock = 0`，可售库存仍是 8。支付只是把两件商品从`RESERVED`转成`CONFIRMED`，不会再次占用可售库存。

```java
@Transactional
public String confirm(String reservationId, long orderId) {
    Header header = lockedHeader(reservationId, orderId);
    if ("CONFIRMED".equals(header.state())) {
        return "CONFIRMED";
    }
    if (!"RESERVED".equals(header.state())) {
        throw new ReservationStateException("RESERVATION_NOT_RESERVED");
    }

    for (Line line : items(reservationId)) {
        int updated = jdbc.update("""
                UPDATE pms_sku_stock
                SET stock = stock - ?, lock_stock = lock_stock - ?
                WHERE id = ? AND stock >= ? AND lock_stock >= ?
                """, line.quantity(), line.quantity(), line.skuId(),
                line.quantity(), line.quantity());
        if (updated != 1) {
            throw new IllegalStateException("INVENTORY_INVARIANT_BROKEN");
        }
    }

    jdbc.update("""
            UPDATE ims_reservation
            SET state = 'CONFIRMED', updated_at = NOW(3)
            WHERE reservation_id = ? AND state = 'RESERVED'
            """, reservationId);
    return "CONFIRMED";
}
```

### 取消后释放

释放数量来自 `ims_reservation_item`，而不是取消请求传入的数量。客户端因此无法多释放库存，同一取消请求重复执行也不会再次减少 `lock_stock`。

方法开头插入 `RELEASED` 还有一个用途：处理消息乱序。如果取消消息先到、预占消息后到，取消请求会先写入一张没有明细的 `RELEASED` 记录。迟到的 `reserve` 看到该状态后直接拒绝，不会在订单已经取消后重新锁库存。

这段逻辑只处理取消和预占之间的乱序。`confirm` 早于 `reserve` 时会被拒绝，因为没有预占明细可供确认。订单服务应在确认预占成功后才允许进入支付流程，并让同一 `reservation_id` 的命令按顺序投递。如果消息通道不能保证顺序，确认命令需要在预占完成后重试，不能跳过状态检查直接扣库存。

```java
@Transactional
public String release(String reservationId, long orderId) {
    jdbc.update("""
            INSERT INTO ims_reservation(
                reservation_id, order_id, request_hash, state, expires_at
            )
            VALUES (?, ?, NULL, 'RELEASED', NULL)
            ON DUPLICATE KEY UPDATE reservation_id = reservation_id
            """, reservationId, orderId);

    Header header = lockedHeader(reservationId, orderId);
    if ("RELEASED".equals(header.state())) {
        return "RELEASED";
    }
    if (!"RESERVED".equals(header.state())) {
        throw new ReservationStateException("RESERVATION_CANNOT_RELEASE");
    }

    for (Line line : items(reservationId)) {
        int updated = jdbc.update("""
                UPDATE pms_sku_stock
                SET lock_stock = lock_stock - ?
                WHERE id = ? AND lock_stock >= ?
                """, line.quantity(), line.skuId(), line.quantity());
        if (updated != 1) {
            throw new IllegalStateException("INVENTORY_INVARIANT_BROKEN");
        }
    }

    jdbc.update("""
            UPDATE ims_reservation
            SET state = 'RELEASED', updated_at = NOW(3)
            WHERE reservation_id = ? AND state = 'RESERVED'
            """, reservationId);
    return "RELEASED";
}
```

### 超时库存释放

示例

```java
public List<ExpiredReservation> findExpired(int limit) {
	if (limit <= 0 || limit > 1000) {
		throw new IllegalArgumentException("INVALID_BATCH_SIZE");
	}
	return jdbc.query("""
			SELECT reservation_id, order_id
			FROM ims_reservation
			WHERE state = 'RESERVED' AND expires_at <= NOW(3)
			ORDER BY expires_at
			LIMIT ?
			""", (rs, rowNum) -> new ExpiredReservation(
			rs.getString("reservation_id"), rs.getLong("order_id")), limit);
}
```

```java
@Component
public class ReservationExpiryJob {
    private static final Logger LOGGER = LoggerFactory.getLogger(ReservationExpiryJob.class);

    private final ReservationService reservationService;
    private final int batchSize;

    public ReservationExpiryJob(
            ReservationService reservationService,
            @Value("${inventory.reservation-expiry-batch-size:100}") int batchSize) {
        this.reservationService = reservationService;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${inventory.reservation-expiry-scan-ms:5000}")
    public void releaseExpiredReservations() {
        for (ExpiredReservation reservation : reservationService.findExpired(batchSize)) {
            try {
                // release 通过 Spring 代理进入独立事务，多实例重复扫描也不会重复释放。
                reservationService.release(
                        reservation.reservationId(), reservation.orderId());
            } catch (IllegalStateException ex) {
                // 支付确认可能与超时释放同时发生，最终状态由预占单行锁串行决定。
                LOGGER.info("Skip expired reservation {}, reason={}",
                        reservation.reservationId(), ex.getMessage());
            } catch (RuntimeException ex) {
                LOGGER.warn("Failed to release expired reservation {}",
                        reservation.reservationId(), ex);
            }
        }
    }
}
```

## 超时重试可靠性

微服务调用会出现响应超时，调用方如果没收到成功信息，不知道库存服务有没有提交事务。

有了幂等设计，也就是`reservation_id`，订单服务可以直接重试。

1. 第一次请求没提交，重试正常预占
2. 第一次已经提交没收到成功消息，重试发现RESERVED，直接返回当前状态
3. 同一个 ID 被错误用到另一组商品，request_hash不一致返回冲突
4. 订单已经取消，重试读到RELEASED，不会重新预占

确认和释放逻辑相同，调用方如果超时，继续用`reservation_id`重试，库存变化最多发生一次。

## 没有解决分布式事务

`@Transactional` 只覆盖库存服务自己的数据库，不能同时回滚订单库。以下故障仍然可能发生：

- 库存预占成功，订单服务在记录结果前挂了
- 订单取消成功，释放请求没有发出去
- 支付成功，确认库存的消息重复或延迟到达

一种常见做法是让订单服务在本地事务中同时写订单和 outbox 事件，再由后台任务可靠投递。库存服务按至少一次语义消费命令，并依靠 `reservation_id` 去重。库存服务处理完成后也可以用 outbox 发布预占结果，订单服务再幂等更新订单状态。

如果仍使用同步 HTTP，原则也不变：订单先落库，再调用库存；遇到超时就使用相同幂等键重试。预占成功但订单流程没有继续时，由主动补偿和 `expires_at` 兜底释放。

只有在调用方可靠地驱动状态变化、失败命令可以持续重试时，完整业务流程才真正闭环。库存库里的一个本地事务不能代替跨服务一致性方案。

## 行锁性能瓶颈

条件更新保证了正确性，也意味着热门 SKU 的请求会竞争同一行锁。数据库连接数、事务耗时、磁盘 IO 和锁等待都会限制吞吐量。这个问题不能靠优化 SQL 来消除。

不同的业务可以采用不同的方案。

普通商品场景通常先采用数据库条件更新，因为实现简单、数据源单一，也容易核对。秒杀场景可以考虑请求排队、Redis Lua 原子预扣、库存分段或令牌化，但这些方案会引入缓存和数据库之间的一致性、补偿及对账问题。优化前应先压测确认瓶颈，不能用一套尚未闭环的双写方案替换已经正确的数据库事务。

无论是否引入缓存，预占身份、状态机和幂等语义仍然需要保留。Redis 可以改变竞争发生的位置，不能替代“这批库存属于哪个订单”的业务记录。

---

先把数据库的库存，预占对账做得可靠，后续的消息可靠投递，缓存预扣和秒杀优化才有可核对和补偿的基础。
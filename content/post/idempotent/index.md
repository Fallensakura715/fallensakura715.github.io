---
date: 2026-10-15T15:31:28+08:00
draft: false
title: 订单幂等与支付回调改造
image: https://imgu.falnsakura.top/PicGo/2026/10/8a2585dc8d80efbea2282a17ef3228dc.webp
categories:
  - 技术
tags:
  - 后端
  - Java
  - Spring
  - mall
---
## 原项目的问题

原单体项目把订单服务拆出来后有几问题。

1. 重复下单

	原来的下单流程，每次执行`generateOrder()`，最终总会调用`orderMapper.insert(order);`，它没有识别这个请求是否曾经处理过，同一笔订单，重试一次就会多创建一次。

2. 订单状态相互覆盖

	如果支付和取消同时发生，后来的操作会覆盖前面的状态。订单刚支付完就有个取消请求，订单就会被直接取消，没有退款流程或者支付成功状态。

	即：取消请求查到：订单待付款 -> 支付请求把订单改成已支付 -> 取消请求继续执行，把订单覆盖成已关闭。先查过待付款不能保证更新时仍然待付款。

```java
public void cancelOrder(Long orderId) {  
    //查询未付款的取消订单  
    OmsOrderExample example = new OmsOrderExample();  
    example.createCriteria()
		    .andIdEqualTo(orderId)
			.andStatusEqualTo(0)
			.andDeleteStatusEqualTo(0);  
    List<OmsOrder> cancelOrderList = orderMapper.selectByExample(example);  
    if (CollectionUtils.isEmpty(cancelOrderList)) {  
        return;  
    }  
    OmsOrder cancelOrder = cancelOrderList.get(0);  
    if (cancelOrder != null) {  
        //修改订单状态为取消  
        cancelOrder.setStatus(4);  
        orderMapper.updateByPrimaryKeySelective(cancelOrder);  
        OmsOrderItemExample orderItemExample = new OmsOrderItemExample();  
        orderItemExample.createCriteria().andOrderIdEqualTo(orderId);  
        List<OmsOrderItem> orderItemList = orderItemMapper
		        .selectByExample(orderItemExample);  

		...
    }  
}
```

3. 请求重试重复扣积分

	原来下单之后会：
	- 使用优惠券
	- 扣积分
	- 删除购物车商品
	- 发送延迟取消消息
```java
orderItemDao.insertList(orderItemList);  
if (orderParam.getCouponId() != null) {  
    updateCouponStatus(orderParam.getCouponId(), currentMember.getId(), 1);  
}  
if (orderParam.getUseIntegration() != null) {  
    order.setUseIntegration(orderParam.getUseIntegration());  
    if(currentMember.getIntegration()==null){  
        currentMember.setIntegration(0);  
    }  
    memberService.updateIntegration(currentMember.getId(), 
		    currentMember.getIntegration() - orderParam.getUseIntegration());  
}  
deleteCartItemList(cartPromotionItemList, currentMember);  
sendDelayMessageCancelOrder(order.getId());
```

如果重试请求拿到原订单后，继续执行这些代码，仍然可能重复扣积分。

4. 支付通知来了，直接把订单改成已支付
- 原来验签后直接拿订单号调用支付成功逻辑，缺少完整付款记录和校验。
- 如果订单金额不对，用户付了0.01元但是支付通知签名是真的，就能用0.01买走该订单商品。
- 如果支付宝没收到`success`通知，就会一直发送同一条通知，`trade_no`是同一个，每次通知都会跑一边`paySuccess()`流程，修改订单支付状态、扣库存。
- 或者同一张订单付了两次钱，交易号不同，多交的一笔钱会直接返回`success`支付成功，不会退款。
```java
public Integer paySuccess(Long orderId, Integer payType) {  
    OmsOrder order = new OmsOrder();  
    order.setId(orderId);  
    order.setStatus(1);  
    order.setPaymentTime(new Date());  
    order.setPayType(payType);  
    orderMapper.updateByPrimaryKeySelective(order);  
    
    OmsOrderDetail orderDetail = portalOrderDao.getDetail(orderId);  
    int count = portalOrderDao.updateSkuStock(orderDetail.getOrderItemList());  
    return count;  
}

public String notify(Map<String, String> params) {  
    String result = "failure";  
    boolean signVerified = false;  
    try {  
        //调用SDK验证签名  
        signVerified = AlipaySignature.rsaCheckV1(params, 
		        alipayConfig.getAlipayPublicKey(), 
		        alipayConfig.getCharset(), 
		        alipayConfig.getSignType());  
    } catch (AlipayApiException e) {  
        log.error("支付回调签名校验异常！",e);  
        e.printStackTrace();  
    }  
    if (signVerified) {  
        String tradeStatus = params.get("trade_status");  
        if("TRADE_SUCCESS".equals(tradeStatus)){  
            result = "success";  
            log.info("notify方法被调用了，tradeStatus:{}",tradeStatus);  
            String outTradeNo = params.get("out_trade_no");  
            portalOrderService.paySuccessByOrderSn(outTradeNo,1);  
        }else{  
            log.warn("订单未支付成功，trade_status:{}",tradeStatus);  
        }  
    } else {  
        log.warn("支付回调签名校验失败！");  
    }  
    return result;  
}
```

5. 订单关闭后收到付款，又被强行改回待发货

	本地超时任务关闭了订单之后，支付成功通知到达，验签就又会调用`paySuccess()`，执行一系列流程，把订单状态改成`1`。

## 设计下单幂等请求

由于上文讲到的问题，需要给下单请求加个唯一标识，让请求能安全地重试。还需要用户 ID ，把用户 ID 和客户端生成的请求幂等 key 作为联合主键去重，可以防止越权下单。

唯一键就是并发锁：

- A 先 `insert` 成功，事务还没提交
- B 的 `insert` 撞上唯一索引，**会阻塞等待 A 的结果**
- A 提交：B 收到 `DuplicateKeyException`，进 catch，`lock` 读到 A 的 SUCCESS 记录并直接返回
- A 回滚：B 的 `insert` 成功，B 接着创建订单

幂等前提是相同请求得到相同结果。如果同一个 key 带了不同参数，这就不是重试了，不能直接返回旧的订单，要对关键内容摘要做哈希(定长、省空间)，重放比对一致就是正常重试请求。

除此之外，需要标记下单请求处理进度。如果先插入幂等记录抢占 key，再创建订单。这时并发重试的第二个请求会因主键冲突失败，它需要知道第一个请求进行到哪了(库存和下单、优惠券的事务拆开了)：

| state      | 含义             | 重试时的处理                  |
| ---------- | -------------- | ----------------------- |
| PROCESSING | 第一个请求还在处理      | 返回"处理中"，让客户端稍后重试或轮询     |
| SUCCESS    | 订单已创建          | 直接返回 `order_id`         |
| UNKNOWN    | 暂时没有可见记录，可能未提交 | 按业务决定：返回失败，或允许重置后重试<br> |

### 流程

1. INSERT
2. 成功
	1. 首次请求创建订单
	2. 主键冲突 SELECT 幂等请求表
		1. hash 不同拒绝
		2. `SUCCESS` 返回 `order_id`
		3. `PROCESSING` 返回处理中
3. 创建订单

### 建表

```sql
CREATE TABLE oms_order_request (
    member_id BIGINT NOT NULL,
    idempotency_key VARCHAR(64) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    order_id BIGINT,
    state VARCHAR(16) NOT NULL,
    PRIMARY KEY(member_id, idempotency_key)
) ENGINE=InnoDB;
```

### 代码实现

#### SQL 和 DAO
> [!TIPS]
> `lock` 用 `FOR UPDATE` 有死锁的风险，InnoDB 里 `insert` 撞唯一键失败后，会对冲突的索引记录加 S 锁，持有到事务结束。
> 
> 如果有两个以上的重复请求，各自持有 S 锁，都执行 `SELECT ... FOR UPDATE` ，把 S 升级成 X
> 两边互相等待对方释放 S 锁，其中一个被回滚。
> 
> 重复请求只需要读最新数据，用共享锁读取即可，改成 `FOR SHARE` 。

```java
...
public interface OrderRequestDao {

    @Insert("""
            INSERT INTO oms_order_request (
                member_id, idempotency_key, request_hash, state
            ) VALUES (
                #{memberId}, #{key}, #{hash}, 'PROCESSING'
            )
            """)
    int insert(@Param("memberId") Long memberId,
               @Param("key") String key,
               @Param("hash") String hash);

    @Select("""
            SELECT member_id AS memberId,
                   idempotency_key AS idempotencyKey,
                   request_hash AS requestHash,
                   order_id AS orderId,
                   state
            FROM oms_order_request
            WHERE member_id = #{memberId}
              AND idempotency_key = #{key}
            """)
    Row find(@Param("memberId") Long memberId,
             @Param("key") String key);

    @Select("""
            SELECT member_id AS memberId,
                   idempotency_key AS idempotencyKey,
                   request_hash AS requestHash,
                   order_id AS orderId,
                   state
            FROM oms_order_request
            WHERE member_id = #{memberId}
              AND idempotency_key = #{key}
            FOR SHARE
            """)
    Row lock(@Param("memberId") Long memberId,
             @Param("key") String key);

    @Update("""
            UPDATE oms_order_request
            SET order_id = #{orderId}, state = 'SUCCESS'
            WHERE member_id = #{memberId}
              AND idempotency_key = #{key}
              AND request_hash = #{hash}
              AND state = 'PROCESSING'
              AND order_id IS NULL
            """)
    int complete(@Param("memberId") Long memberId,
                 @Param("key") String key,
                 @Param("hash") String hash,
                 @Param("orderId") Long orderId);

    @Data
    class Row {
        private Long memberId;
        private String idempotencyKey;
        private String requestHash;
        private Long orderId;
        private String state;
    }
}
```

#### 业务代码

并发请求可能等待唯一键锁。锁等待超时的处理放在后面的 Controller 中，不能在事务已经失败后继续写订单。

幂等记录要和订单必须同生共死，失败时要整体回滚。如果不是：
- 记录提交，订单失败，客户端用原 key 重试一直卡在`PROCESSING`。
- 订单提交，记录失败，重试查不到记录，重复下单和没有幂等记录表一样。

放进同一个事务后，订单创建失败，幂等记录一起回滚，MySQL 里什么都没留下。`probe` 返回 `UNKNOWN`，客户端可以放心用原 key 重新下单。

部分下单服务：

```java
@Transactional(readOnly = true)
public OrderCreateParam probe(OrderRequestIdentity identity) {
	validateIdentity(identity);

	String hash = hash(identity);
	OrderRequestDao.Row row = requestDao.find(
			identity.memberId(), identity.idempotencyKey());

	return toResult(identity, hash, row);
}

@Transactional(rollbackFor = Exception.class)
public OrderCreateParam create(OrderCreateParam param) {
	if (param == null) {
		throw badRequest("下单参数不能为空");
	}

	OrderRequestIdentity identity = param.getIdentity();
	validateIdentity(identity);
	String hash = hash(identity);

	try {
		requestDao.insert(
				identity.memberId(),
				identity.idempotencyKey(),
				hash);
	} catch (DuplicateKeyException ex) {
		// 同会员、同 key 已存在。
		// 如果另一笔事务尚未提交，唯一键检查会等待其结果。
		OrderRequestDao.Row row = requestDao.lock(
				identity.memberId(), identity.idempotencyKey());

		if (row == null) {
			throw new IllegalStateException("幂等请求记录不存在");
		}
		return toResult(identity, hash, row);
	}

	// 以下分支只有首次插入请求记录的事务能够执行。
	OmsOrder order = param.getOrder();
	if (order == null
			|| !Objects.equals(order.getMemberId(), identity.memberId())
			|| order.getId() != null
			|| param.getOrderItemList() == null
			|| param.getOrderItemList().isEmpty()) {
		throw badRequest("订单或订单明细不合法");
	}

	// 创建状态由订单服务决定。
	order.setStatus(0);
	order.setDeleteStatus(0);
	order.setPaymentTime(null);

	// 调用另一个 Spring Bean，原 create() 的事务会加入当前事务。
	OrderCreateParam result = orderService.create(param);

	int changed = requestDao.complete(
			identity.memberId(),
			identity.idempotencyKey(),
			hash,
			result.getOrder().getId());

	if (changed != 1) {
		throw new IllegalStateException("幂等请求完成状态写入失败");
	}

	result.setIdentity(identity);
	result.setRequestState("SUCCESS");
	result.setCreated(true);
	return result;
}

private OrderCreateParam toResult(
		OrderRequestIdentity identity,
		String hash,
		OrderRequestDao.Row row) {

	OrderCreateParam result = new OrderCreateParam();
	result.setIdentity(identity);
	result.setCreated(false);
	result.setOrderItemList(List.of());

	if (row == null) {
		// 普通查询看不到未提交记录，不能断言请求从未发生。
		result.setRequestState("UNKNOWN");
		return result;
	}

	if (!hash.equals(row.getRequestHash())) {
		throw new ResponseStatusException(
				HttpStatus.CONFLICT,
				"同一个幂等键不能用于不同的下单参数");
	}

	if ("PROCESSING".equals(row.getState())) {
		result.setRequestState("PROCESSING");
		return result;
	}

	if (!"SUCCESS".equals(row.getState())
			|| row.getOrderId() == null) {
		throw new IllegalStateException("幂等请求状态异常");
	}

	OmsOrder order = orderService.getById(row.getOrderId());
	if (order == null) {
		throw new IllegalStateException("幂等记录对应的订单不存在");
	}

	result.setRequestState("SUCCESS");
	result.setOrder(order);
	result.setOrderItemList(orderService.getItems(order.getId()));
	return result;
}
```

#### Controller

不能在 Service 的 `@Transcational` 方法内部 catch 掉这个异常，Spring 看不到异常，会以为方法成功，尝试 commit，死锁时数据不一致可能已经回滚了，状态不一致了。

```java
public OrderCreateParam create(OrderCreateParam param) {
    try {
        return requestService.create(param);
    } catch (CannotAcquireLockException ex) {
        // 进入这里时，requestService 的事务已经回滚。
        // 让客户端查询并使用原 key 重试。
        OrderCreateParam result = new OrderCreateParam();
        result.setIdentity(param.getIdentity());
        result.setRequestState("PROCESSING");
        result.setCreated(false);
        result.setOrderItemList(java.util.List.of());
        return result;
    }
}
```

门户服务里下单逻辑取消订单等逻辑都要修改。

### 长事务的缺点

1. 锁持有时间变长。行锁需要到事务提交/回滚后才释放，需要修改只能排队，容易出现锁等待超时。所以要在 Controller 捕获 `CannotAcquireLockException`。
2. 占数据库连接。容易堵住数据库连接，其他接口也拿不到连接，整个服务都慢。
3. 死锁概率上升。
4. 回滚耗时。

可以把幂等记录作为一个短事务先提交成 `PROCESSING`，订单走自己的事务，最后更新记录。但是，处理卡死在 `PROCESSING` 恢复的复杂度非常大(加个时间字段、CAS、定时任务)，~~我偷个懒先~~。

## 支付幂等

### 建表

核心思路就是把一笔真实的付款单独存成一条流水，用交易号唯一性保证同一笔钱只入账一次。

交易号在同一个渠道唯一，把 `provider` 和 `trade_no` 作为主键幂等判断。这样同一笔付款重复通知会抛异常，两条相同通知后一个 `INSERT` 阻塞等前一个事务结果，和订单幂等处理相似。

订单表维护三个状态：

|状态|含义|什么时候出现|
|---|---|---|
|`RECEIVED`|已收到付款信息，事务内处理中|先插入这条记录，占住唯一键|
|`APPLIED`|已用于支付该订单|订单状态更新成功后，同一事务内改成这个|
|`REFUND_PENDING`|已收款，需要退款|订单已被另一笔付款支付、订单已关闭等，这笔钱无法履约|


```java
CREATE TABLE oms_order_payment (
    provider VARCHAR(16)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    trade_no VARCHAR(128)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    order_id BIGINT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    state VARCHAR(32) NOT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, trade_no),
    KEY idx_order_id (order_id)
) ENGINE=InnoDB;
```

### 代码实现
#### notify 通知接收

```java
public String notify(Map<String, String> params) {
    try {
        boolean verified = AlipaySignature.rsaCheckV1(
	            params,
                alipayConfig.getAlipayPublicKey(),
                alipayConfig.getCharset(),
                alipayConfig.getSignType());

        if (!verified) {
            return "failure";
        }

        if (!Objects.equals(alipayConfig.getAppId(), params.get("app_id"))) {
            return "failure";
        }

        if (alipayConfig.getSellerId() == null
                || !Objects.equals(
                        alipayConfig.getSellerId(),
                        params.get("seller_id"))) {
            return "failure";
        }

        String tradeStatus = params.get("trade_status");

        if (!"TRADE_SUCCESS".equals(tradeStatus)
                && !"TRADE_FINISHED".equals(tradeStatus)) {
            // 非付款成功通知，不执行支付状态转换。
            return "success";
        }

        PaymentNotice notice = new PaymentNotice(
                params.get("out_trade_no"),
                params.get("trade_no"),
                new BigDecimal(params.get("total_amount")));

        OrderTransitionResult result = orderService.acceptAlipay(notice);

        if ("REFUND_PENDING".equals(result.result())) {
            // 订单服务已持久化待退款记录。
            // 后续退款流程处理，不能确认库存或强行改订单状态。
            log.warn(
                    "付款已登记待退款，orderId:{}, tradeNo:{}",
                    result.order().getId(),
                    notice.tradeNo());

            return "success";
        }

        if ("PAID".equals(result.result())
                || "ALREADY_PAID".equals(result.result())) {

            Integer status = result.order().getStatus();
            if (Integer.valueOf(1).equals(status)
                    || Integer.valueOf(2).equals(status)
                    || Integer.valueOf(3).equals(status)) {

                Long orderId = result.order().getId();
                
                // 相同 reservationId 的重复确认必须幂等。
                // 如果上次状态已提交但确认库存失败，
                // 平台重试通知时仍可重试这里。
                inventoryService.confirm(
                        SkuStockReserveParam.reservationIdForOrder(orderId),
                        new SkuStockReserveParam.ReservationActionRequest(orderId));
            }
            return "success";
        }
        return "failure";
    } catch (Exception ex) {
        log.error("处理支付宝支付通知失败", ex);
        return "failure";
    }
}
```

#### 订单校验

主要流程：
1. 校验参数
2. 锁订单行 (FOR UPDATE)，同一订单的两条通知会在这里排队，关闭订单也会锁订单行。
3. 插入付款记录
4. 锁付款记录，核对订单和金额，确认这个交易号对应的是不是同一订单、同一金额。
5. 付款金额不对退款
6. 看付款记录状态
	- `APPLIED`：这笔钱以前已经用于支付订单，当前通知是重发，返回 `ALREADY_PAID`
	- `REFUND_PENDING`：这笔钱以前已经被判定要退款，重发时返回同样的结果
	- `RECEIVED`：刚插入的新记录，继续处理
7. 条件更新订单，如果失败(关闭，或者被另一笔付款支付)不覆盖已有订单状态。

> [!TIPS]
> 为什么先锁 `oms_order` 再操作 `oms_order_payment`  ？
> 
> 如果反过来，一旦有其他地方按订单查流水加锁，加锁顺序相反就会引发死锁。需要固定顺序，先订单后流水的加锁顺序防止死锁。

| 场景               | acceptAlipay     | notify              |
| ---------------- | ---------------- | ------------------- |
| 订单待付款，首次通知       | `PAID`           | 确认库存，返回 success     |
| 同一交易号重发，已经入账     | `ALREADY_PAID`   | 再确认一次库存（补偿），success |
| 订单已关闭，或已被另一笔付款支付 | `REFUND_PENDING` | 打日志，success         |
| 同一交易号重发，之前已是待退款  | `REFUND_PENDING` | 打日志，success         |
| 订单金额不符           | `REFUND_PENDING` | 打日志，success         |
| 参数非法、订单不存在、交易号冲突 | 抛异常，整个事务回滚       | catch 后返回 failure   |

```java
@Transactional(rollbackFor = Exception.class)  
public OrderTransitionResult acceptAlipay(PaymentNotice notice) {  
    if (notice == null  
            || !StringUtils.hasText(notice.orderSn())  
            || !StringUtils.hasText(notice.tradeNo())  
            || notice.tradeNo().length() > 128  
            || notice.amount() == null  
            || notice.amount().signum() <= 0  
            || notice.amount().stripTrailingZeros().scale() > 2) {  
        throw error(HttpStatus.BAD_REQUEST, "付款参数不合法");  
    }  
  
    OmsOrder order = stateDao.lockByOrderSn(notice.orderSn());  
    if (order == null) {  
        throw error(HttpStatus.NOT_FOUND, "订单不存在");  
    }  
  
    try {  
        paymentDao.insert(notice.tradeNo(), order.getId(), notice.amount());  
    } catch (DuplicateKeyException ex) {  
        // 重复通知仍需读取已有付款记录，核对订单、金额和处理状态。  
    }  
  
    OrderPaymentDao.Row payment = paymentDao.lock(notice.tradeNo());  
    if (payment == null) {  
        throw new IllegalStateException("付款记录不存在");  
    }  
  
    if (!Objects.equals(payment.getOrderId(), order.getId())  
            || payment.getAmount().compareTo(notice.amount()) != 0) {  
        throw error(HttpStatus.CONFLICT, "该平台交易号已经绑定其他订单或金额");  
    }  
  
    if ("APPLIED".equals(payment.getState())) {  
        return new OrderTransitionResult("ALREADY_PAID", order);  
    }  
    if ("REFUND_PENDING".equals(payment.getState())) {  
        return new OrderTransitionResult("REFUND_PENDING", order);  
    }  
    if (!"RECEIVED".equals(payment.getState())) {  
        throw new IllegalStateException("付款记录状态异常");  
    }  
  
    if (order.getPayAmount() == null 
		    || order.getPayAmount().compareTo(notice.amount()) != 0) {  
        finishPayment(notice.tradeNo(), "REFUND_PENDING");  
        return new OrderTransitionResult("REFUND_PENDING", order);  
    }  
  
    int changed = stateDao.markPaid(order.getId());  
    if (changed == 1) {  
        finishPayment(notice.tradeNo(), "APPLIED");  
        return new OrderTransitionResult("PAID", stateDao.lockById(order.getId()));  
    }  
  
    finishPayment(notice.tradeNo(), "REFUND_PENDING");  
    return new OrderTransitionResult("REFUND_PENDING", 
		    stateDao.lockById(order.getId()));  
}
```

## 其它
- 跨服务最终一致性尚未完成。订单状态已提交后，确认或释放库存仍可能失败。返回失败让平台重试只能提供一条恢复路径，不能代替可靠事件和恢复任务。
- 积分、优惠券等外围操作仍存在中断窗口。例如订单创建提交后，门户还没扣积分就宕机，重试虽然不会重复下单，却也不会自动补做缺失操作，需要后续事件机制处理。

原单体项目主要只考虑了正常流程，但一旦把订单服务独立拆出来，网络超时重试、并发读写、回调乱序就会出现很多问题。幂等和状态机看似多写了不少防御性代码和冗余表，但在交易链路里，保证可靠性，永远比省事更重要。
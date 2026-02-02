---
title: Spring 中 @Transactional 的生效条件与失效场景
date: 2026-02-02 11:08:38
tags:
  - 后端
  - Java
  - Spring
  - 源码分析
  - 数据库
categories:
  - 技术
cover: https://imgu.falnsakura.top/PicGo/2026/02/cb5562ff312d615525beffefc4f6f560.png
---
某天订单系统出现了一个数据不一致问题：用户支付成功了，但订单状态没更新，优惠券却已经被核销。排查后发现，开发同学在 Service 中写了一个内部方法调用， `@Transactional` 悄无声息地失效了。

这类问题在实际开发中屡见不鲜。要彻底理解 `@Transactional` 为何失效，我们必须先搞清楚它是如何生效的。
## @Transactional 的原理

### 声明式事务

`@Transactional` 的本质是 **AOP 代理 + 事务拦截器**。理解这一点是分析所有生效/失效场景的基础。

当我们在方法上标注 `@Transactional` 时，Spring 并不会对我们的代码做任何修改。它的魔法在于 **代理模式**。

Spring 在启动时会扫描所有带有 `@Transactional` 注解的 Bean，然后为这些 Bean 创建一个代理对象。当外部调用这个 Bean 的方法时，实际上调用的是代理对象，而不是原始对象。代理对象会在调用真实方法前后插入事务管理的逻辑。

**没有代理时的调用链：**

```
调用方 → 目标对象.方法()
```

**有代理时的调用链：**

```
调用方 → 代理对象.方法() → 开启事务 → 目标对象.方法() → 提交/回滚事务
```

这就是为什么 `@Transactional` 被称为"声明式事务"——你只需要声明（标注注解），Spring 帮你实现事务管理。但这也意味着， **如果调用绕过了代理对象，事务就不会生效**。

### 代理实现的方式

Spring 支持两种代理方式：

**JDK 动态代理**：基于接口实现。如果你的 Bean 实现了接口，Spring 默认使用这种方式。代理对象和目标对象实现同一个接口，调用时通过接口方法进入代理逻辑。

**CGLIB 代理**：基于继承实现。如果你的 Bean 没有实现接口，Spring 会使用 CGLIB 生成一个目标类的子类作为代理。子类覆写了父类的方法，在覆写的方法中加入事务逻辑。

CGLIB 基于继承的特性决定了 `final` 方法无法被代理，子类无法覆写父类的 `final` 方法。

## 事务是如何被拦截和管理的

### 事务拦截器

Spring 事务的核心拦截器是 `TransactionInterceptor`，它实现了 `MethodInterceptor` 接口。每当代理对象的方法被调用时，都会先经过这个拦截器。

拦截器的工作流程如下：

1. **解析事务属性**：读取方法上的 `@Transactional` 注解，获取传播行为、隔离级别、超时时间、回滚规则等配置。
2. **获取事务管理器**：根据配置找到对应的 `PlatformTransactionManager`（如 `DataSourceTransactionManager`）。
3. **开启事务**：调用事务管理器的 `getTransaction()` 方法，根据传播行为决定是开启新事务还是加入已有事务。
4. **执行业务方法**：调用目标对象的真实方法。
5. **处理执行结果**：如果方法正常返回，提交事务；如果抛出异常，根据回滚规则决定回滚还是提交。
### 关键源码

事务的核心处理逻辑在 `TransactionAspectSupport` 类的 `invokeWithinTransaction` 方法中：

```java
protected Object invokeWithinTransaction(Method method, Class<?> targetClass,
        final InvocationCallback invocation) throws Throwable {
    
    // 第一步：获取事务属性
    // 这里会解析 @Transactional 注解的所有配置项
    TransactionAttributeSource tas = getTransactionAttributeSource();
    final TransactionAttribute txAttr = tas.getTransactionAttribute(method, targetClass);
    
    // 第二步：获取事务管理器
    final TransactionManager tm = determineTransactionManager(txAttr);
    
    // 第三步：创建事务（如果需要）
    TransactionInfo txInfo = createTransactionIfNecessary(ptm, txAttr, methodId);
    
    Object retVal;
    try {
        // 第四步：执行真实的业务方法
        retVal = invocation.proceedWithInvocation();
    }
    catch (Throwable ex) {
        // 第五步：异常处理——决定回滚还是提交
        completeTransactionAfterThrowing(txInfo, ex);
        throw ex;
    }
    
    // 第六步：正常返回时提交事务
    commitTransactionAfterReturning(txInfo);
    return retVal;
}
```

### 事务回滚规则

在 `completeTransactionAfterThrowing` 方法中：

```java
protected void completeTransactionAfterThrowing(TransactionInfo txInfo, Throwable ex) {
    if (txInfo.transactionAttribute.rollbackOn(ex)) {
        // 匹配回滚规则，执行回滚
        txInfo.getTransactionManager().rollback(txInfo.getTransactionStatus());
    }
    else {
        // 不匹配回滚规则，仍然提交！
        txInfo.getTransactionManager().commit(txInfo.getTransactionStatus());
    }
}
```

默认的回滚规则定义在 `DefaultTransactionAttribute` 中：

```java
public boolean rollbackOn(Throwable ex) {
    return (ex instanceof RuntimeException || ex instanceof Error);
}
```

这意味着： **默认情况下，只有 `RuntimeException` 及其子类，以及 `Error`，才会触发回滚。** 如果抛出的是 `IOException`、 `SQLException` 这类受检异常，事务会正常提交。

## 事务生效五个条件

`@Transactional` 生效必须同时满足的条件：

### Bean 必须由 Spring 容器管理

这是最基本的前提。只有被 Spring 管理的 Bean，Spring 才有机会为其创建代理。如果你手动 `new` 了一个对象，或者类上没有 `@Service`、 `@Component` 等注解，那这个对象就是一个普通的 Java 对象，与 Spring 无关，自然也不会有事务能力。
### 方法必须是 public

Spring 在解析 `@Transactional` 注解时，会显式检查方法的访问修饰符。如果方法不是 `public`，注解会被直接忽略。

这个限制的原因与代理机制有关。JDK 动态代理只能代理接口方法（接口方法默认都是 public）；CGLIB 虽然理论上可以代理非 public 方法，但 Spring 为了保持一致性和明确性，统一要求必须是 public 方法。
### 必须通过代理对象调用

这是最容易踩坑的地方。即使前两个条件都满足了，如果调用方式绕过了代理对象，事务依然不会生效。典型的场景就是同一个类中的方法互相调用（后面会详细讲解）。
### 事务管理器必须正确配置

Spring 需要一个 `PlatformTransactionManager` 来实际管理事务。对于 JDBC 操作，通常是 `DataSourceTransactionManager`；对于 JPA，是 `JpaTransactionManager`。如果你使用 Spring Boot，自动配置通常会帮你搞定这一切。但在某些复杂场景（如多数据源），你需要手动指定使用哪个事务管理器。
### 底层存储引擎必须支持事务

事务是数据库层面的概念。如果你使用的存储引擎不支持事务（如 MySQL 的 MyISAM 引擎），那么无论 Spring 层面怎么配置，事务都不会生效。MySQL 请务必使用 InnoDB 引擎。
## 事务失效八个场景

### 同类中的内部方法调用

**这是最常见、最隐蔽的失效场景。**
假设有这样一段代码：

```java
@Service
public class OrderService {
    
    public void createOrder(Order order) {
        // 保存订单
        saveOrder(order);
        // 绑定优惠活动
        bindPromotion(order);  // 直接调用本类方法
    }
    
    @Transactional
    public void bindPromotion(Order order) {
        promotionDao.bindOrder(order);
        // 如果这里抛异常，期望回滚
    }
}
```

开发者的预期是 `bindPromotion` 方法有独立的事务，如果失败应该回滚。但实际上，这个事务根本不会生效。

**原因分析**：当外部调用 `orderService.createOrder()` 时，确实是通过代理对象进入的。但在 `createOrder` 方法内部调用 `bindPromotion` 时，此时的 `this` 指向的是目标对象（原始的 OrderService 实例），而不是代理对象。调用直接发生在目标对象内部，完全绕过了代理层的事务拦截器。

**解决方案**：

方案一：注入自身的代理对象

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderService self;  // 注入自己，拿到的是代理对象
    
    public void createOrder(Order order) {
        saveOrder(order);
        self.bindPromotion(order);  // 通过代理对象调用
    }
}
```

方案二：使用 `AopContext` 获取当前代理

```java
@Service
public class OrderService {
    
    public void createOrder(Order order) {
        saveOrder(order);
        // 需要配置 @EnableAspectJAutoProxy(exposeProxy = true)
        ((OrderService) AopContext.currentProxy()).bindPromotion(order);
    }
}
```

方案三：将方法拆分到不同的类中
这是最推荐的做法，既解决了自调用问题，也符合单一职责原则。
### 方法不是 public

```java
@Service
public class UserService {
    
    @Transactional
    void updateUser(User user) {  // 包级别访问权限
        userDao.update(user);
    }
    
    @Transactional
    protected void deleteUser(Long id) {  // protected
        userDao.delete(id);
    }
    
    @Transactional
    private void innerUpdate(User user) {  // private
        userDao.update(user);
    }
}
```

以上三种写法， `@Transactional` 都不会生效。Spring 在 `AbstractFallbackTransactionAttributeSource` 类中有明确的检查：

```java
if (allowPublicMethodsOnly() && !Modifier.isPublic(method.getModifiers())) {
    return null;  // 返回null表示没有事务属性
}
```

这个限制的设计初衷是：非 public 方法通常是内部实现细节，不应该暴露给外部调用。如果你需要事务，说明这个方法应该是一个对外的业务入口，理应是 public 的。
### 异常被 catch 后没有重新抛出

```java
@Service
public class PaymentService {
    
    @Transactional
    public void processPayment(Payment payment) {
        try {
            paymentDao.save(payment);
            thirdPartyApi.charge(payment);  // 可能抛异常
        } catch (Exception e) {
            log.error("支付失败", e);
            // 异常被吞掉了，方法正常返回
        }
    }
}
```

这段代码的问题在于： `catch` 块捕获了异常后，只是打印了日志，没有重新抛出。从事务拦截器的视角来看，方法正常执行完毕并返回了，没有任何异常抛出到方法边界之外。根据前面分析的源码逻辑，正常返回会触发 `commitTransactionAfterReturning`，事务被提交了。

**解决方案**：

方法一：重新抛出异常

```java
@Transactional
public void processPayment(Payment payment) {
    try {
        paymentDao.save(payment);
        thirdPartyApi.charge(payment);
    } catch (Exception e) {
        log.error("支付失败", e);
        throw new RuntimeException("支付处理失败", e);  // 重新抛出
    }
}
```

方法二：手动标记事务回滚

```java
@Transactional
public void processPayment(Payment payment) {
    try {
        paymentDao.save(payment);
        thirdPartyApi.charge(payment);
    } catch (Exception e) {
        log.error("支付失败", e);
        // 手动标记当前事务需要回滚
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}
```
### 抛出了受检异常但没有配置 rollbackFor

```java
@Service
public class FileService {
    
    @Transactional
    public void uploadFile(MultipartFile file) throws IOException {
        fileDao.saveMetadata(file);
        
        if (file.getSize() > MAX_SIZE) {
            throw new IOException("文件过大");  // 受检异常
        }
        
        storageService.store(file);
    }
}
```

这个方法抛出了 `IOException`，这是一个受检异常（Checked Exception），不属于 `RuntimeException` 的子类。根据默认的回滚规则，这个异常不会触发回滚，事务会正常提交。

**正确写法**：

```java
@Transactional(rollbackFor = Exception.class)  // 指定所有异常都回滚
public void uploadFile(MultipartFile file) throws IOException {
    // ...
}
```

或者更精确地指定：

```java
@Transactional(rollbackFor = {IOException.class, BusinessException.class})
public void uploadFile(MultipartFile file) throws IOException {
    // ...
}
```

阿里巴巴 Java 开发手册建议， `@Transactional` 注解应该始终指定 `rollbackFor = Exception.class`，避免受检异常导致的意外提交。
### 类没有被 Spring 管理

```java
// 注意：没有 @Service、@Component 等注解
public class StandaloneService {
    
    @Transactional
    public void doSomething() {
        // 这个类不是 Spring Bean，注解无效
    }
}
```

使用时如果手动创建实例：

```java
StandaloneService service = new StandaloneService();
service.doSomething();  // 没有事务
```

这种情况下，Spring 根本不知道这个类的存在，自然也不会为它创建代理。 `@Transactional` 注解就是一个普通的注解标记，没有任何运行时效果。
### 多线程调用

```java
@Service
public class BatchService {
    
    @Transactional
    public void batchProcess(List<Order> orders) {
        // 使用并行流处理
        orders.parallelStream().forEach(order -> {
            orderDao.save(order);  // 每个线程独立，不在主事务中
        });
        
        // 或者手动创建线程
        new Thread(() -> {
            orderDao.save(someOrder);  // 新线程，没有事务
        }).start();
    }
}
```

Spring 的事务信息是存储在 `ThreadLocal` 中的。 `ThreadLocal` 的特性是线程隔离：每个线程有自己独立的变量副本。当你创建新线程或使用并行流时，新线程无法访问主线程的事务上下文，因此它们的数据库操作是在没有事务的情况下执行的。

主线程中的事务回滚，不会影响子线程已经提交的操作；子线程的操作失败，也不会导致主线程事务回滚。数据一致性完全无法保证。

**解决方案**：避免在事务方法中使用多线程，或者为每个线程单独管理事务（但这样就不是同一个事务了）。
### 使用了 final 或 static

```java
@Service
public class FinalService {
    
    @Transactional
    public final void finalMethod() {
        // CGLIB 无法覆写 final 方法
    }
    
    @Transactional
    public static void staticMethod() {
        // static 方法不属于实例，无法被代理
    }
}
```

对于 `final` 方法：CGLIB 通过继承目标类来创建代理，但子类无法覆写父类的 `final` 方法，因此事务拦截逻辑无法插入。

对于 `static` 方法：静态方法属于类而不是实例，代理对象拦截的是实例方法调用。你调用 `FinalService.staticMethod()` 时，根本不经过任何代理对象。
### 底层存储引擎不支持事务

现在 MySQL 默认是 InnoDB 存储引擎，但是如果你的 MySQL 表使用了 MyISAM 引擎：

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    amount DECIMAL(10,2)
) ENGINE = MyISAM;
```

MyISAM 引擎不支持事务。无论你的 Java 代码如何配置，数据库层面根本不会开启事务。Spring 的事务管理器以为自己在管理事务，实际上数据库根本不配合。

## 传播行为的困惑

```java
@Service
public class OuterService {
    @Autowired
    private InnerService innerService;
    
    @Transactional
    public void outerMethod() {
        orderDao.createOrder(order);  // 操作1
        
        try {
            innerService.innerMethod();  // 这个方法会抛异常
        } catch (Exception e) {
            log.error("内部方法执行失败，但我想继续", e);
        }
        
        orderDao.updateOrderStatus(order);  // 操作2，期望能执行
    }
}

@Service  
public class InnerService {
    
    @Transactional  // 默认 REQUIRED 传播行为
    public void innerMethod() {
        // 做一些操作后抛出异常
        throw new RuntimeException("业务异常");
    }
}
```

开发者的预期是： `innerMethod` 失败后，我在外层 catch 住异常，继续执行后续逻辑。但实际运行时，当执行到 `orderDao.updateOrderStatus` 时，会抛出 `UnexpectedRollbackException`，提示事务已被标记为回滚。

**原因分析**：默认的传播行为是 `REQUIRED`，表示"如果当前存在事务，就加入该事务"。所以 `innerMethod` 和 `outerMethod` 实际上在同一个事务中。当 `innerMethod` 抛出 `RuntimeException` 时，事务被标记为 `rollback-only`（必须回滚）。即使你在外层 catch 住了异常，这个标记仍然存在。当 `outerMethod` 尝试正常返回时，事务管理器发现事务已被标记为必须回滚，于是抛出异常。

**解决方案**：如果希望内层方法的失败不影响外层事务，可以使用 `REQUIRES_NEW` 传播行为：

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void innerMethod() {
    // 独立的新事务，回滚不影响外层
}
```

## 排查事务问题

### 开启事务调试日志

在 `application.yml` 中配置：

```yaml
logging:
  level:
    org.springframework.transaction.interceptor: TRACE
    org.springframework.jdbc.datasource.DataSourceTransactionManager: DEBUG
```

### 代码中检查事务状态

```java
@Transactional
public void someMethod() {
    boolean isActive = TransactionSynchronizationManager.isActualTransactionActive();
    log.info("当前是否在事务中: {}", isActive);  // 应该输出 true
}
```

### 检查代理类型

```java
@Autowired
private OrderService orderService;

public void checkProxy() {
    System.out.println(orderService.getClass().getName());
    // 如果是代理，会输出类似：
    // com.example.service.OrderService$$EnhancerBySpringCGLIB$$xxxxx
}
```

如果输出的是原始类名，说明没有被代理。

## 总结

**核心原则：**

1. **理解代理机制**： `@Transactional` 的生效依赖于 AOP 代理，任何绕过代理的调用都会导致失效。
2. **让异常飞出去**：事务的回滚依赖于异常抛出。如果你 catch 了异常，要么重新抛出，要么手动标记回滚。
3. **明确指定 rollbackFor** ：不要依赖默认的回滚规则，建议始终配置 `rollbackFor = Exception.class`。

`@Transactional` 的本质是通过代理在方法执行前后插入事务管理代码。理解了这一点，所有失效场景都能用"是否经过代理"和"异常是否抛出"这两个问题来分析。
Page({
  //提交订单
  formSubmit: async function(e) {
    let that = this;
    let formData = e.detail.value;
    console.log('form发生了submit事件，携带数据为：', formData);
    // 在数据库中创建一个待支付的订单
    let order = await db.collection('orders').add({
      data: {
        orderid: formData.orderid,
        money: formData.money,
        status: 'pending', // 设置订单状态为待支付
        time: new Date()
      }
    });
    let res = await wx.cloud.callFunction({
      name: "pay",
      data: {
        orderid: "" + formData.orderid,
        money: formData.money
      }
    });
    if (res.result) {
      console.log("提交成功", res.result);
      that.pay(res.result, order);
    } else {
      console.log("提交失败", res);
    }
  },

  //实现小程序支付
  pay(payData, order) {
    let that = this;
    //官方标准的支付方法
    wx.requestPayment({
      timeStamp: payData.timeStamp,
      nonceStr: payData.nonceStr,
      package: payData.package, //统一下单接口返回的 prepay_id 格式如：prepay_id=***
      signType: 'MD5',
      paySign: payData.paySign, //签名
      success(res) {
        console.log("支付成功", res);
        // 支付成功后更新订单状态
        that.updateOrderStatus(order, 'paid');
        // 将支付数据存入数据库
        that.savePaymentData(order);
        // 计算并显示总金额
        that.calculateTotal();
      },
      fail(res) {
        console.log("支付失败", res);
        // 支付失败后更新订单状态
        that.updateOrderStatus(order, 'failed');
      },
      complete(res) {
        console.log("支付完成", res);
      }
    });
  },

  // 更新订单状态
  updateOrderStatus: async function(order, status) {
    await db.collection('orders').doc(order._id).update({
      data: {
        status: status
      }
    });
    console.log('订单状态已更新为：', status);
  },

  // 保存支付数据
  savePaymentData: async function(order) {
    await db.collection('payments').add({
      data: {
        orderid: order.orderid,
        money: order.money,
        time: new Date()
      }
    });
    console.log('支付数据已保存');
  },

  // 计算总金额
  calculateTotal: async function() {
    let res = await db.collection('payments').get();
    let total = res.data.reduce((sum, payment) => sum + Number(payment.money), 0);
    console.log('总金额：', total);
    this.setData({ total: total }); // 将总金额保存到 data 中，以便在页面上显示
  }
});

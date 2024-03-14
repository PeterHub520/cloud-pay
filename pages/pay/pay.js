Page({
  //提交订单
  formSubmit: async function(e) {
    let that = this;
    let formData = e.detail.value;
    console.log('form发生了submit事件，携带数据为：', formData);
    let res = await wx.cloud.callFunction({
      name: "pay",
      data: {
        orderid: "" + formData.orderid,
        money: formData.money
      }
    });
    if (res.result) {
      console.log("提交成功", res.result);
      that.pay(res.result, formData);
    } else {
      console.log("提交失败", res);
    }
  },

  //实现小程序支付
  pay(payData, formData) {
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
        // 将支付数据存入数据库
        that.savePaymentData(formData);
      },
      fail(res) {
        console.log("支付失败", res);
      },
      complete(res) {
        console.log("支付完成", res);
      }
    });
  },

  // 保存支付数据
  savePaymentData: async function(formData) {
    await db.collection('payments').add({
      data: {
        orderid: formData.orderid,
        money: formData.money,
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



$(document).ready(function() {
  $(window).keydown(function (e) {
    if (e.keyCode == 116) {
      if (!confirm("刷新将会清除所有聊天记录，确定要刷新么？")) {
        e.preventDefault();
      }
    }
  });
  var socket = io.connect();
  var from = $.cookie('user');//从 cookie 中读取用户名，存于变量 from
  var to = 'all';//设置默认接收对象为"所有人"
  //发送用户上线信号
  socket.emit('online', {user: from});
  socket.on('online', function (data) {
    //显示系统消息
    if (data.user != from) {
      var sys = '<div style="color:#fffdfd">System (' + now() + '):' + 'User ' + data.user + ' enter the room！</div>';
    } else {
      var sys = '<div style="color:#fffdfd">System (' + now() + '):you enter the room！</div>';
    }
    $("#contents").append(sys + "<br/>");
    //刷新用户在线列表
    flushUsers(data.users);
    //显示正在对谁说话
    showSayTo();
  });

  socket.on('say', function (data) {
    //对所有人说
    if (data.to == 'all') {
      //$("#contents").append('<div>' + data.from + '(' + now() + ')are talking to Public：<br/>' + data.msg + '</div><br />');
      $("#contents").append('<div class="saying"><span class="name">'+data.from+'</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+now()+'</span><br/><h4>'+data.msg+'</h4></div><br/>');

    }
    //对你密语
    if (data.to == from) {
        $("#contents").append('<div class="saying"><span class="private" style="color: #cc0000">' + data.from + '</span><span class="name" style="color: #0099FF">&nbsp; talking to you </span><span style="font-size: 36px"> </span><span style="font-size: 12px">' + now() + '</span><br/><h4>' + data.msg + '</h4></div><br/>');
    }


  });

  socket.on('offline', function (data) {
    //显示系统消息
    var sys = '<div style="color:#fffdfd">System(' + now() + '):' + 'User ' + data.user + ' exit the room！</div>';
    $("#contents").append(sys + "<br/>");
    //刷新用户在线列表
    flushUsers(data.users);
    //如果正对某人聊天，该人却下线了
    if (data.user == to) {
      to = "all";
    }
    //显示正在对谁说话
    showSayTo();
  });

  //服务器关闭
  socket.on('disconnect', function() {
      var sys = '<div style="color:#fffdfd">System: fail to connect server！</div>';
    $("#contents").append(sys + "<br/>");
    $("#list").empty();
  });

  //重新启动服务器
  socket.on('reconnect', function() {
      var sys = '<div style="color:#fffdfd">System: retry!</div>';
    $("#contents").append(sys + "<br/>");
    socket.emit('online', {user: from});
  });

  //刷新用户在线列表
  function flushUsers(users) {
    //清空之前用户列表，添加 "所有人" 选项并默认为灰色选中效果
    $("#list").empty().append('<li title="双击聊天" alt="all" class="sayingto" onselectstart="return false"> Public</li>');
    //遍历生成用户在线列表
    for (var i in users) {
      $("#list").append('<li alt="' + users[i] + '" title="双击聊天" onselectstart="return false">' + users[i] + '</li>');
    }
    //双击对某人聊天
    $("#list > li").dblclick(function() {
      //如果不是双击的自己的名字
      if ($(this).attr('alt') != from) {
        //设置被双击的用户为说话对象
        to = $(this).attr('alt');
        //清除之前的选中效果
        $("#list > li").removeClass('sayingto');
        //给被双击的用户添加选中效果
        $(this).addClass('sayingto');
        //刷新正在对谁说话
        showSayTo();
      }
    });
  }

  //显示正在对谁说话
  function showSayTo() {
    $("#from").html(from);
    $("#to").html(to == "all" ? " Public" : to);
  }

  //获取当前时间
  function now() {
    var date = new Date();
    var time = (date.getMonth() + 1) + '-' + date.getDate() + '-' +date.getFullYear() +  ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? ('0' + date.getSeconds()) : date.getSeconds());
    return time;
  }

  //发话
  $("#say").click(function() {
    //获取要发送的信息
    var $msg = $("#input_content").html();
    if ($msg == "") return;
    //把发送的信息先添加到自己的浏览器 DOM 中
    if (to == "all") {
      $("#contents").append('<div class="saying"><span class="name">Me</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+now()+'</span><br/><h4>'+$msg+'</h4></div><br/>');

    } else {
        $("#contents").append('<div class="saying"><span class="name" style="color: #0099FF">You now talking to </span><span class="private" style="color: #cc0000">' + to + '</span><span style="font-size: 36px"> </span><span style="font-size: 12px">' + now() + '</span><br/><h4>' + $msg + '</h4></div><br/>');
    }//发送发话信息
    socket.emit('say', {from: from, to: to, msg: $msg});
    //清空输入框并获得焦点
    $("#input_content").html("").focus();
  });


    $(window).keydown(function (e) {
    if (e.keyCode == 13) {
      var $msg = $("#input_content").html();
      if ($msg == "") return;
      if (to == "all") {
        $("#contents").append('<div class="saying"><span class="name">Me</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+now()+'</span><br/><h4>'+$msg+'</h4></div><br/>');

      } else {
          $("#contents").append('<div class="saying"><span class="name" style="color: #0099FF">You now talking to </span><span class="private" style="color: #cc0000">' + to + '</span><span style="font-size: 36px"> </span><span style="font-size: 12px">' + now() + '</span><br/><h4>' + $msg + '</h4></div><br/>');
      }
      //发送发话信息
      socket.emit('say', {from: from, to: to, msg: $msg});
      //清空输入框并获得焦点
      $("#input_content").html("").focus();
    }});


});


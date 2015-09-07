$(document).ready(function() {
  $(window).keydown(function (e) {
    if (e.keyCode == 116) {
      if (!confirm("Are you sure to refresh?")) {
        e.preventDefault();
      }
    }
  });
  var socket = io.connect();
  var from = $.cookie('user');
  var to = 'all';

    socket.on("history",function(data){
        console.log(data);
        if(data.length){
            for(var i = data.length-1;i>-1;i=i-1){
                $("#contents").append('<div class="saying"><span class="name">'+data[i].name+'</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+data[i].time+'</span><br/><h4>'+data[i].msg+'</h4></div><br/>');
            }
        }
    });


  socket.emit('online', {user: from});
  socket.on('online', function (data) {

    if (data.user != from) {
      var sys = '<div style="color:#fffdfd">System (' + now() + '):' + 'User ' + data.user + ' enter the room！</div>';
    } else {
      var sys = '<div style="color:#fffdfd">System (' + now() + '):you enter the room！</div>';
    }
    $("#contents").append(sys + "<br/>");

    flushUsers(data.users);

    showSayTo();
  });

  socket.on('say', function (data) {

    if (data.to == 'all') {
      $("#contents").append('<div class="saying"><span class="name">'+data.from+'</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+now()+'</span><br/><h4>'+data.msg+'</h4></div><br/>');

    }

    if (data.to == from) {
        $("#contents").append('<div class="saying"><span class="private" style="color: #cc0000">' + data.from + '</span><span class="name" style="color: #0099FF">&nbsp; are talking to you </span><span style="font-size: 36px"> </span><span style="font-size: 12px">' + now() + '</span><br/><h4>' + data.msg + '</h4></div><br/>');
    }


  });

  socket.on('offline', function (data) {

    var sys = '<div style="color:#fffdfd">System(' + now() + '):' + 'User ' + data.user + ' exit the room！</div>';
    $("#contents").append(sys + "<br/>");

    flushUsers(data.users);

    if (data.user == to) {
      to = "all";
    }

    showSayTo();
  });

  socket.on('disconnect', function() {
      var sys = '<div style="color:#fffdfd">System: fail to connect server！</div>';
    $("#contents").append(sys + "<br/>");
    $("#list").empty();
  });


  socket.on('reconnect', function() {
      var sys = '<div style="color:#fffdfd">System: retry!</div>';
    $("#contents").append(sys + "<br/>");
    socket.emit('online', {user: from});
  });


  function flushUsers(users) {

    $("#list").empty().append('<li title="双击聊天" alt="all" class="sayingto" onselectstart="return false"> Public</li>');

    for (var i in users) {
      $("#list").append('<li alt="' + users[i] + '" title="双击聊天" onselectstart="return false">' + users[i] + '</li>');
    }

    $("#list > li").dblclick(function() {

      if ($(this).attr('alt') != from) {

        to = $(this).attr('alt');

        $("#list > li").removeClass('sayingto');

        $(this).addClass('sayingto');

        showSayTo();
      }
    });
  }


  function showSayTo() {
    $("#from").html(from);
    $("#to").html(to == "all" ? " Public" : to);
  }


  function now() {
    var date = new Date();
    var time = (date.getMonth() + 1) + '-' + date.getDate() + '-' +date.getFullYear() +  ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? ('0' + date.getSeconds()) : date.getSeconds());
    return time;
  }


  $("#say").click(function() {

    var $msg = $("#input_content").html();
    if ($msg == "") return;

    if (to == "all") {
      $("#contents").append('<div class="saying"><span class="name">Me</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+now()+'</span><br/><h4>'+$msg+'</h4></div><br/>');

    } else {
        $("#contents").append('<div class="saying"><span class="name" style="color: #0099FF">You are talking to </span><span class="private" style="color: #cc0000">' + to + '</span><span style="font-size: 36px"> </span><span style="font-size: 12px">' + now() + '</span><br/><h4>' + $msg + '</h4></div><br/>');
    }
    socket.emit('say', {from: from, to: to, msg: $msg});

    $("#input_content").html("").focus();
  });


    $(window).keydown(function (e) {
    if (e.keyCode == 13) {
      var $msg = $("#input_content").html();
      if ($msg == "") return;
      if (to == "all") {
        $("#contents").append('<div class="saying"><span class="name">Me</span><span style="font-size: 36px"> </span><span style="font-size: 12px">'+now()+'</span><br/><h4>'+$msg+'</h4></div><br/>');

      } else {
          $("#contents").append('<div class="saying"><span class="name" style="color: #0099FF">You are talking to </span><span class="private" style="color: #cc0000">' + to + '</span><span style="font-size: 36px"> </span><span style="font-size: 12px">' + now() + '</span><br/><h4>' + $msg + '</h4></div><br/>');
      }

      socket.emit('say', {from: from, to: to, msg: $msg});

      $("#input_content").html("").focus();
    }});


});


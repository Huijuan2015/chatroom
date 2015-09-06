
/**
 * 程序中要用到的依赖包
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , http = require('http')
    , path = require('path')
    ,sqliteDB=require('./db.js');

var app = express();


/**
 * set port 8080
 * */
app.set('port', process.env.PORT || 5858);

/**
 * set views  and view engine as jade
 * */
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');


/**
 * app.use 加载用于处理http請求的middleware（中间件），当一个请求来的时候，会依次被这些 middlewares处理。

 * 执行的顺序是你定义的顺序
 * */
// all environments   ,这是所有node工程都需要的吧
//网站图标
//app.use(express.favicon());
//日志
app.use(express.logger('dev'));
//这俩不知道是什么，但是每一个程序都有，IDEA会自动生成
app.use(express.bodyParser());
app.use(express.cookieParser());

app.use(express.methodOverride());

//app路由，相当于MVC里面的C
app.use(app.router);
//这句是说程序中用到的静态资源，比如图片啊js脚本啊，都在public文件目录下面
app.use(express.static(path.join(__dirname, 'public')));

//app.get(‘env’)  ：当前用户环境变量中NODE_ENV值；
// development only ,  只有开发环境需要配这个
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/**
 * 这个users数组很重要哦，装着在线的用户名
 * */
var users = {};//存储在线用户列表的对象

sqliteDB.connect(function(error){
  if (error) throw error;
})

sqliteDB.setup(function(error){
  if (error){
    console.log('ERROR ' + error);
    throw error;
  }})
/**
 * app.get('/'） 是加载网站首页的意思：然后后面的function是决定加载哪个作为首页：
 * 如果客户端请求cookies里面的user为null(没有登录记录），请求加载/signin;
 * 否则直接加载聊天页面（/index.html)
 * */
app.get('/', function (req, res) {
  if (req.cookies.user == null) {
    res.redirect('/signin');
  } else {
    res.sendfile('views/index.html');
  }
});

/**
 * 如果是（通过get）请求/signin,则返回views下的signin.html文件（页面）给客户端
 * */
app.get('/signin', function (req, res) {
  res.sendfile('views/signin.html');
});



/**
 * post，即登录界面提交。判断一下输入的昵称是不是已经在users列表里了。
 * 存在就继续在登录界面
 * 不存在：用户名放进cookies里面的user里，然后去主页（这里你可以回头看下前面的 app.get('/'))
 * */
app.post('/signin', function (req, res) {
  if (users[req.body.name]) {
    //存在，则不允许登陆
    res.redirect('/signin');
  } else {
    //不存在，把用户名存入 cookie 并跳转到主页,cookie有效期为24小时
    res.cookie("user", req.body.name, {maxAge: 1000*60*60*24});
    res.redirect('/');
  }
});

app.get('/history', function (req,res) {
  var data = sqliteDB.all(function (error) {
    if (error) throw error;
    else
      console.info("select all from DB success");
  });
  res.sendfile('views/history.html', {data: data});
});

app.post('/history', function (req,res) {
  res.sendfile('views/history.html')
});

/**
 * 把上面的配置和逻辑都配置好了之后，就可以开启服务器啦
 * */
var server = http.createServer(app);

/**
 * 将 socket.io 绑定到服务器上，于是任何连接到该服务器的客户端都具备了实时通信功能
 * */
var io = require('socket.io').listen(server);

/**
 * 服务器监听所有客户端，并返回该新连接对象，接下来我们就可以通过该连接对象（socket）与客户端进行通信了
 * 这个大函数是说：在‘connection'事件后（客户端跟服务器连接），服务器要监听以下事件：’online','say','disconnect'等，并且作出反应（emit)
 * */
io.sockets.on('connection', function (socket) {
  /**
   * emit ：用来发射一个事件或者说触发一个事件，第一个参数为事件名，第二个参数为要发送的数据，
   * 第三个参数为回调函数（一般省略，如需对方接受到信息后立即得到确认时，则需要用到回调函数）。
   * on ：用来监听一个 emit 发射的事件，第一个参数为要监听的事件名，第二个参数为一个匿名函数
   * 用来接收对方发来的数据，该匿名函数的第一个参数为接收的数据，若有第二个参数，则为要返回的函数。
   * */

    //有人上线
  socket.on('online', function (data) {
    //将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
    socket.name = data.user;
    //users 对象中不存在该用户名则插入该用户名
    if (!users[data.user]) {
      users[data.user] = data.user;
    }
    //向所有用户广播该用户上线信息
    io.sockets.emit('online', {users: users, user: data.user});
  });

  //有人发话
  /**
   * 监听index.html里面发送聊天消息：<div id="say">发送</div>
   * 这个say在chat.js文件的最后，
   * data内容是socket.emit('say', {from: from, to: to, msg: $msg});
   * */
  socket.on('say', function (data) {
    if (data.to == 'all') {
      //向其他所有用户广播该用户发话信息
      socket.broadcast.emit('say', data);
      sqliteDB.add(data.from,data.msg, function(error){
        if (error) throw error;
        console.info("insert into DB success");
      })
    } else {
      //向特定用户发送该用户发话信息
      //clients 为存储所有连接对象的数组
      var clients = io.sockets.clients();
      //遍历找到该用户
      clients.forEach(function (client) {
        if (client.name == data.to) {
          //触发该用户客户端的 say 事件
          client.emit('say', data);
        }
      });
    }
  });

  /**
   *
   * socket.emit() ：向建立该连接的客户端广播
   * socket.broadcast.emit() ：向除去建立该连接的客户端的所有客户端广播
   * io.sockets.emit() ：向所有客户端广播，等同于上面两个的和
   *
   * */

    //有人下线
  socket.on('disconnect', function() {
    //若 users 对象中保存了该用户名
    if (users[socket.name]) {
      //从 users 对象中删除该用户名
      delete users[socket.name];
      //向其他所有用户广播该用户下线信息
      socket.broadcast.emit('offline', {users: users, user: socket.name});
    }
  });
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


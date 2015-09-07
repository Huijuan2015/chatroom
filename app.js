
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

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


var users = {};

sqliteDB.connect(function(error){
  if (error) throw error;
})

sqliteDB.setup(function(error){
  if (error){
    console.log('ERROR ' + error);
    throw error;
  }})

app.get('/', function (req, res) {
  if (req.cookies.user == null) {
    res.redirect('/signin');
  } else {
    res.sendfile('views/index.html');
  }
});


app.get('/signin', function (req, res) {
  res.sendfile('views/signin.html');
});


app.post('/signin', function (req, res) {
  if (users[req.body.name]) {
    res.redirect('/signin');
  } else {
    res.cookie("user", req.body.name, {maxAge: 1000*60*60*24});
    res.redirect('/');
  }
});

/*app.get('/history', function (req,res) {
  var data = sqliteDB.all(function (error, rows) {
    if (error) throw error;
    else {
      console.info("select all from DB success");

      res.json()
    }

  });

}*/

app.post('/history', function (req,res) {
  res.sendfile('views/history.html')
});


var server = http.createServer(app);

var io = require('socket.io').listen(server);


io.sockets.on('connection', function (socket) {

  socket.on('online', function (data) {
     socket.name = data.user;

    if (!users[data.user]) {
      users[data.user] = data.user;
    }

    io.sockets.emit('online', {users: users, user: data.user});
  });


  socket.on('say', function (data) {
    if (data.to == 'all') {

      socket.broadcast.emit('say', data);
      sqliteDB.add(data.from,data.msg, function(error){
        if (error) throw error;
        console.info("insert into DB success");
      })
    } else {

      var clients = io.sockets.clients();

      clients.forEach(function (client) {
        if (client.name == data.to) {

          client.emit('say', data);
        }
      });
    }
  });


  socket.on('disconnect', function() {

    if (users[socket.name]) {

      delete users[socket.name];

      socket.broadcast.emit('offline', {users: users, user: socket.name});
    }
  });
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


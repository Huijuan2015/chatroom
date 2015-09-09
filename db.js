//数据库接口库
var util = require('util');
var sqlite3 = require('sqlite3').verbose();

var db = undefined;

/*
 数据库名是直接硬编码的，所以当调用connect和setup函数时，当前目录中就会生成chap06.sqlite3文件
 */

exports.connect = function(callback){
    db = new sqlite3.Database("chatroom.sqlite3", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        function(err){
            if (err){
                util.log('FAIL on creating database ' + err);
                callback(err);
            } else {
                callback(null);
            }
        });
}

//此处的disconnect函数是空的
exports.disconnect = function(callback){
    callback(null);
}

exports.setup = function(callback){
    db.run("CREATE TABLE IF NOT EXISTS history " +
        "(time DATETIME, name VARCHAR(255), content TEXT)",
        function(err){
            if (err){
                util.log('FAIL on creating table ' + err);
                callback(err);
            } else {
                callback(null);
            }
        });
}
function now() {
    var date = new Date();
    var time =  (date.getMonth() + 1) + '.' + date.getDate()+ '.' +date.getFullYear()  + ' ' + date.getHours() + ':' + date.getMinutes();
    return time;
}

exports.emptyNote = {"time": "", name: "", content: ""};
exports.add = function(name, content, callback){
    db.run("INSERT INTO history (time, name, content) " +
        "VALUES (?, ?, ?);",
        [now(), name, content],
        function(error){
            if (error){
                util.log('FAIL on add ' + error);
                callback(error);
            } else {
                callback(null);
            }
        });
}
/*
 run函数接受一个字符串参数，其中?表示占位符，占位符的值必须通过一个数组传递进来
 调用者提供了一个回调函数，然后通过这个回调函数来声明错误
 */

exports.delete = function(time, callback){
    db.run("DELETE FROM history WHERE time = ?;",
        [time],
        function(err){
            if (err){
                util.log('FAIL to delete ' + err);
                callback(err);
            } else {
                callback(null);
            }
        });
}



exports.all = function(callback){
    util.log(' in all history');
    db.all("SELECT * FROM history limit 30", callback);
}
exports.forAll = function(doEach, done){
    db.each("SELECT * FROM history order by time DESC limit 30", function(err, row){
        if (err){
            util.log('FAIL to retrieve row ' + err);
            done(err, null);
        } else {
            doEach(null, row);
        }
    }, done);
}
/*
 allNotes和forAll函数是操作所有数据的两种方法，allNotes把数据库中所有的数据行收集到一个数组里，
 而forAll方法可以接受两个回调函数，每当从数据集中拿一行数据，回调函数doEach都会执行一遍，当读完所有数据时，回调函数done就会执行
 */

exports.findById = function(time, callback){
    var didOne = false;
    db.each("SELECT * FROM history WHERE time = ?",
        [time],
        function(err, row){
            if (err){
                util.log('FAIL to retrieve row ' + err);
                callback(err, null);
            } else {
                if (!didOne){
                    callback(null, row);
                    didOne = true;   //保证回调函数只被执行一次
                }
            }
        });
}
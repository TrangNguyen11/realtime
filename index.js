var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const uuidv4 = require('uuid/v4');

var port = process.env.PORT || 3000;
var session = {};

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/getListTable' , function(req, res){
    res.send(session);

})

io.on('connection', function(socket){
  socket.on('sudungban', function(data){
    let arrBan = data.idArr;
    let color =  data.color;
    let id = uuidv4();
    session[id]= { ban: arrBan, color };  
    io.emit('ban',{ id, ban: arrBan, color });
  });


  socket.on('ghepban', function(data){
    let arrBan = data.idArr;
    let color =  data.color;
  
    let id = !!data.session ? data.session :  uuidv4();
    session[id]= { ban: arrBan, color };  
    io.emit('ban',{ id, ban: arrBan, color });
  });

  socket.on('chuyenban', function(data){
    let { idChuyen, sessionChuyen, idDen } = data;
    session[sessionChuyen].ban  = session[sessionChuyen].ban.filter( e => e !== idChuyen + "");
    session[sessionChuyen].ban.push(idDen+ "");
    io.emit('ban',{ id: sessionChuyen, ban: [idDen+ ""], color: session[sessionChuyen].color });
    io.emit('ban',{ id: undefined, ban: [idChuyen+ ""],  color : 'none', status : false });

  });

  

});


http.listen(port, function(){
  console.log('listening on *:' + port);
});

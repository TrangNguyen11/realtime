var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const uuidv4 = require('uuid/v4');
var port = process.env.PORT || 3000;
var session = {};
var dataBep = [];
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/getListTable' , function(req, res){
  let result = {...session};
    Object.keys(result).forEach(key => {
      if(!!result[key].dathanhtoan) delete result[key]; 
    })
    res.send(result);
})

app.get('/getMonAnBep', function(req, res){
  res.send(dataBep);
});

io.on('connection', function(socket){
  socket.on('sudungban', function(data, callback){
    let {color, thoigian, mangve, nameban, idArr: arrBan} = data;
    let id = uuidv4();
    session[id]= { ban: arrBan, color, thoigian, mangve, nameban};  
    callback(id);
    io.emit('ban',{ id, ban: arrBan, color, nameban});
  });

  socket.on('ghepban', function(data){
    let {color, thoigian, mangve, nameban, idArr: arrBan} = data;
    let id = !!data.session ? data.session :  uuidv4();
    session[id]= { ban: arrBan, color, thoigian, nameban };  
    io.emit('ban',{ id, ban: arrBan, color, nameban });
  });

  socket.on('chuyenban', function(data){
    let { idChuyen, sessionChuyen, idDen, name } = data;
    let key = session[sessionChuyen].ban.indexOf(idChuyen);
    let nameban = session[sessionChuyen].nameban.split(" ").splice(key, 1);
    nameban.push(name);
    nameban = nameban.join(' ');
    session[sessionChuyen].nameban = nameban;
    session[sessionChuyen].ban  = session[sessionChuyen].ban.filter( e => e !== idChuyen + "");
    session[sessionChuyen].ban.push(idDen+ "");
    io.emit('ban',{ id: sessionChuyen, ban: [idDen+ ""], color: session[sessionChuyen].color });
    io.emit('ban',{ id: undefined, ban: [idChuyen+ ""],  color : 'none', status : false });
  });

  socket.on('dataDatMon', function(data){
    let { sessionID, monan, tongtien } = data;
    let curretState = uuidv4();
    let monanPush = monan.filter((e)=> e.status === undefined ).map((e)=> ({...e, status: 0, curretState, sessionID }));
    dataBep = [...monanPush, ...dataBep];
    monan = monan.map((e)=> e.status === undefined? {...e, status: 0, curretState} : e);
    session[sessionID] = {...session[sessionID], tongtien, monan};
    console.log(session);
    io.emit('nauxong', dataBep);
    io.emit('order', {monan, sessionID});
  });

  socket.on('dataXong', function(data){
    let { id, sessionID, curretState } = data;
    session[sessionID].monan = session[sessionID].monan.map(
      (e)=> (e.id === id && e.curretState === curretState)? {...e, status: 2} :e );
    dataBep = dataBep.map((e)=> (e.sessionID === sessionID && e.id === id && e.curretState === curretState
    ? {...e, status: 2} : e ));
    io.emit('nauxong', dataBep);
    io.emit('order', {monan: session[sessionID].monan, sessionID});

  });
  socket.on('dataNau', function(data){
    let { id, sessionID, curretState } = data;
    session[sessionID].monan = session[sessionID].monan.map(
      (e)=> (e.id === id && e.curretState === curretState)? {...e, status: 1} :e );
    dataBep = dataBep.map((e)=> (e.sessionID === sessionID && e.id === id && e.curretState === curretState
    ? {...e, status: 1} : e ));
    io.emit('nauxong', dataBep);
    io.emit('order', {monan: session[sessionID].monan, sessionID});

  });
  socket.on('dataBung', function(data){
    let { id, sessionID, curretState } = data;
    dataBep = dataBep.filter((e)=>
      !(e.sessionID == sessionID && e.id === id && e.curretState === curretState)
    )
    session[sessionID].monan = session[sessionID].monan.map(
      (e)=> (e.id === id && e.curretState === curretState)? {...e, status: 3} :e );
    io.emit('nauxong', dataBep);
    io.emit('order', {monan: session[sessionID].monan, sessionID});
  });
  socket.on('dataHuy', function(data){
    let { id, sessionID, curretState } = data;
    dataBep = dataBep.filter((e)=>
      !(e.sessionID == sessionID && e.id === id && e.curretState === curretState)
    )
    session[sessionID].monan = session[sessionID].monan.map(
      (e)=> (e.id === id && e.curretState === curretState)? {...e, status: 4} :e );
    io.emit('nauxong', dataBep);
    io.emit('order', {monan: session[sessionID].monan, sessionID});
  }); 
  
  socket.on('thanhtoan', function(idsession){
    session[idsession].dathanhtoan = 1;
    io.emit('thanhtoanxong', session);
  });
  socket.on('datamangve', function(data){
    console.log(data);
    let arrBan = data.tenkhach;
    let monan =  data.monan;
    let thoigian = data.thoigian;
    let status = 11;
    let id = uuidv4();    
    session[id]= { ban: arrBan, thoigian, monan};
    session[id].monan = session[id].monan.map(
      (e)=> (e.id === id)? {...e, status: 1} :e );
    dataBep = session[id].monan;
    io.emit('nauxong', dataBep);
    io.emit('emangve',session[id]);
  });
});


http.listen(port, function(){
  console.log('listening on *:' + port);
});

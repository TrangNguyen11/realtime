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
    let {color, thoigian, nameban, idArr: arrBan} = data;
    let id = uuidv4();
    session[id]= { ban: arrBan, color, thoigian, nameban };  
    callback(id);
    io.emit('ban',{ id, ban: arrBan, color, nameban });

    let result = {...session};
    Object.keys(result).forEach(key => {
      if(!!result[key].dathanhtoan) delete result[key]; 
    })

    io.emit('listthanhtoan',result);

  });
  socket.on('sudungmangve', function(data, callback){
    let {color, thoigian, mangve, nameban, idArr: arrBan} = data;
    let id = uuidv4();
    session[id]= { ban: arrBan, color, thoigian, mangve, nameban};  
    callback(id);
    io.emit('mangve',{ id, ban: arrBan, color, nameban, mangve});

    let result = {...session};
    Object.keys(result).forEach(key => {
      if(!!result[key].dathanhtoan) delete result[key]; 
    })

    io.emit('listthanhtoan',result);
    
  });
  
  socket.on('ghepban', function(data){
    let {color, thoigian, mangve, nameban, idArr: arrBan} = data;
    let id = !!data.session ? data.session :  uuidv4();
    let monan = !!data.session ? session[data.session].monan :  [];
    session[id]= { ban: arrBan, color, thoigian, nameban, monan };  
    io.emit('ban',{ id, ban: arrBan, color, nameban, monan });
  });

  socket.on('chuyenban', function(data){
    let { idChuyen, sessionChuyen, idDen, name } = data;
    let key = session[sessionChuyen].ban.indexOf(idChuyen);
    let nameban = session[sessionChuyen].nameban.split(" ").splice(key, 1);
    nameban.push(name);
    nameban = nameban.join(' ');
    session[sessionChuyen].nameban = nameban;
    session[sessionChuyen].ban  = session[sessionChuyen].ban.filter( e => e !== idChuyen+ "");
    session[sessionChuyen].ban.push(idDen);
    io.emit('ban',{ id: sessionChuyen, ban: [idDen+""], color: session[sessionChuyen].color });
    io.emit('ban',{ id: undefined, ban: [idChuyen+ ""],  color : 'none', });
  });
  socket.on('huyban', function(data, callback){
    let { idBan, sessionID } = data;
    if(!session[sessionID].monan) {
      session[sessionID].dathanhtoan = 1;
      io.emit('thanhtoanxong', session);
      io.emit('ban', { id: undefined, ban: session[sessionID].ban, color : 'none' });
    } 
    else {
      if(session[sessionID].ban.length <=1 && session[sessionID].monan.length > 0) callback(false);
      else {
        session[sessionID].ban = session[sessionID].ban.filter( e=> e !== idBan);
        io.emit('ban',{ id: undefined, ban: [idBan+ ""],  color : 'none' });
        callback(true);
      }
    }

  })
  socket.on('dataDatMon', function(data){
    let { sessionID, monan, tongtien, nameban } = data;
    let curretState = uuidv4();
    let monanPush = monan.filter((e)=> e.status === undefined ).map((e)=> ({...e, status: 0, curretState, sessionID, nameban }));
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
      (e)=> {
        if(e.id === id && e.curretState === curretState){
          session[sessionID].tongtien -= e.soluong * e.dongia
          return {...e, status: 4}
        }
        return e
      });
       
    io.emit('nauxong', dataBep);
    io.emit('order', {monan: session[sessionID].monan, sessionID});
  }); 

  socket.on('thanhtoan', function(idsession){
    session[idsession].dathanhtoan = 1;
    io.emit('thanhtoanxong', session);
    if(!!session[idsession].mangve) io.emit('mangve', {id: idsession, dathanhtoan: 1} );
    else io.emit('ban', { id: undefined, ban: session[idsession].ban, color : 'none' });
  });

});
http.listen(port, function(){
  console.log('listening on *:' + port);
});

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const redis = require('redis');

const req = require('requestify');
const tm = require('timers');


// Redis Client

var client = redis.createClient();

client.on('connect', function(){
  console.log('Connected to Redis');

  client.hgetall(id, function(err, obj){
    if (!obj) {
      res.render('searchtasks', {
        error: 'No Task exists!'
      });
    }
  });

});

const port = 3000;
const app = express();

app.engine('handlebars', exphbs({defaultLayout:'main', extname: '.handlebars'}));
app.set('view engine', 'handlebars');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.use(methodOverride('_method'));

app.get('/', function(req, res, next){
  res.render('searchtasks');
});

//Search

app.post('/tasks/search', function(req, res, next){
  var id = req.body.id;
});


var tasks = [];
var sites = ['www.bluegreenvacations.com'];

var wpt_key = 'A.bfc5e0b0f153f23f1b77e951596d3c01';


function makeWPT_Request(site){

  var _prefix = 'http://www.webpagetest.org/runtest.php?url=';
  var _format = '&f=json';
  var _key = '&k=A.bfc5e0b0f153f23f1b77e951596d3c01';

  var _url = _prefix+site+_format+_key;

  req.post(_url).then(function(response){
    var result = response.getBody();
    var result_url = result.data['jsonUrl'];

    tasks.push(result_url);

    process(tasks);

  });

}

function getTestResults(url){

  req.post(url).then(function(response){

    var _statusCode = response.getBody().data.statusCode;

    var _statusText = response.getBody().data.statusText;

    if (_statusCode === 200) {

      console.log(response.getBody());

    }else{

      tryLater(response);

    }

  });

}

function tryLater(response){

  console.log('trying later');

  var _statusCode = response.getBody().data.statusCode;

  var _statusText = response.getBody().data.statusText;

  if (_statusText.indexOf('Waiting')>-1) {

    console.log('Waiting... ');

    var _positionInQueue = getQueuePosition(response.getBody().statusText);

    console.log('task queues position', _positionInQueue);

    if (_positionInQueue > 0) {
      //TODO: Since we are calling it again, the current process should be terminated
      tm.setInterval( getTestResults, Math.max(_positionInQueue*20, 1000), url);
    }else if (_positionInQueue==0) {
      tm.setInterval( getTestResults, 15000, url );
    }

  }else if(_statusText.indexOf('Test just started' || _statusText.indexOf('Waiting at the front'))>-1){
    console.log('waiting at the front', _statusText);
    tm.setInterval( getTestResults, 2000, url );
  }

}


function process(tasks){

  for (var i = 0; i < tasks.length; i++) {
    console.log('in process', tasks[i]);
    getTestResults(tasks[i]);
  }

}

function getQueuePosition(theStatusText){
  console.log('getQueuePosition', theStatusText);
  var numberPattern = /\d+/g;
  var result = theStatusText.match(numberPattern);
  if (!result) {
    return 0;
  }
  return result;
}

// app.get('/', function (req, res) {
//   var result = makeWPT_Request(sites[0]);
//   res.send('making request for: ' + sites[0]);
// });
//
// app.get('/:id', function(req, res){
//   var _html = '<ul>';
//   _html = _html + '<li><a href="/:0">'+tasks[req.params.id]+'</a></li>';
//   _html = _html + '</ul>';
//   res.send(_html);
// });

app.listen(port, function () {
  console.log('Example app listening on port '+port);
  // console.log('request starting for' ,sites[0]);
  // makeWPT_Request(sites[0]);
});

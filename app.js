'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var http = require('http');

var config = require('./config').config;
var FBP = require('./rhei');
var components = require('./components');

process.app = {};

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// CORS
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// THE TODOS
var todos = [
  {task: 'read JPM\'s book', status: 'done', id: 1},
  {task: 'beat nethack', status: 'in progress', id: 2},
  {task: 'meditate', status: 'in progress', id: 3},
  {task: 'find waldo', status: 'done', id: 4},
  {task: 'be a pirate', status: 'in progress', id: 5},
  {task: 'eat some eggs', status: 'done', id: 6},
  {task: 'eat some Maine Lobster', status: 'in progress', id: 7}
];
var currentID = 7;

FBP.debug(true);

/*
 * Define the networks/connections
 */

FBP.network({
  name: 'search',
  processes: [
    {name: 'filter', component: 'filter'},
    {name: 'sendResponse', component: 'sendResponse'}
  ],
  connections: {
    'filter.output': 'sendResponse.data'
  }
});

FBP.network({
  name: 'allTodos',
  processes: [
    {name: 'sendResponse', component: 'sendResponse'}
  ]
});

FBP.network({
  name: 'createTodo',
  processes: [
    {name: 'sendResponse', component: 'sendResponse'},
    {name: 'createTodo', component: 'createTodo'},
    {name: 'insert', component: 'insert'}
  ],
  connections: {
    'createTodo.output': 'insert.el',
    'insert.output': 'sendResponse.data'
  }
});

FBP.network({
  name: 'updateTodo',
  processes: [
    {name: 'sendResponse', component: 'sendResponse'},
    {name: 'update', component: 'update'},
    {name: 'find', component: 'find'},
    {name: 'insert', component: 'insert'}
  ],
  connections: {
    'find.output': 'update.obj',
    'find.outputIdx': 'insert.idx',
    'update.output': 'insert.el',
    'insert.output': 'sendResponse.data'
  }
});

FBP.network({
  name: 'deleteTodo',
  processes: [
    {name: 'sendResponse', component: 'sendResponse'},
    {name: 'del', component: 'del'},
    {name: 'find', component: 'find'}
  ],
  connections: {
    'find.output': 'del.el',
    'del.output': 'sendResponse.data'
  }
});

/*
 * Actually run the networks on route requests
 */

app.get('/search', function (req, res, next) {
  FBP.go(
    'search',
    {
      'filter.filterString': req.query.search,
      'filter.coll': todos,
      'filter.key': 'task',
      'sendResponse.res': res
    }
  );
})

/*
 * Get a 401 error
 */
app.get('/testError', function (req, res, next) {

  res.statusCode = 401;

  FBP.go(
    'allTodos',
    {
      'sendResponse.data': 'this is an error',
      'sendResponse.res': res
    }
  );
});

/*
 * Get an explanation
 */
app.get('/explain', function (req, res, next) {
  FBP.go(
    'allTodos',
    {
      'sendResponse.data': 'this is an explanation for the 401 you just got',
      'sendResponse.res': res
    }
  );
});

/*
 * Get all ToDos
 */
app.get('/todos', function (req, res, next) {
  FBP.go(
    'allTodos',
    {
      'sendResponse.data': todos,
      'sendResponse.res': res
    }
  );
});

/*
 * Create a new ToDo
 */
app.post('/todos', function (req, res, next) {
  // increment currentID
  currentID = currentID + 1;

  FBP.go(
    'createTodo',
    {
      'createTodo.currentID': currentID,
      'createTodo.req': req,
      'insert.coll': todos,
      'insert.idx': null,
      'sendResponse.res': res
    }
  );
});

/*
 * Update a ToDo
 */
app.put('/todo/:id', function (req, res, next) {
  FBP.go(
    'updateTodo',
    {
      'find.coll': todos,
      'find.key': 'id',
      'find.value': parseInt(req.params.id, 10),
      'insert.coll': todos,
      'update.req': req,
      'sendResponse.res': res
    }
  );
});

app.delete('/todo/:id', function (req, res, next) {
  FBP.go(
    'deleteTodo',
    {
      'findTodo.key': 'id',
      'findTodo.value': parseInt(req.params.id, 10),
      'deleteTodo.coll': todos,
      'sendResponse.res': res
    }
  );
});

var port = parseInt(process.env.PORT) || config.port;
app.listen(port); // express
console.log('todo service listening on port ' + port);

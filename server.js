'use strict';

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const http = require('http')

const config = require('./config')
const FBP = require('./rhei')
const components = require('./components')

process.app = {}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// CORS
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  next()
})

const STATUS_IN_PROGRESS = 0
const STATUS_DONE = 1

// THE TODOS
const todos = [
  {task: 'read JPM\'s book', status: 1, id: 1},
  {task: 'beat nethack', status: 0, id: 2},
  {task: 'meditate', status: 0, id: 3},
  {task: 'find waldo', status: 1, id: 4},
  {task: 'be a pirate', status: 0, id: 5},
  {task: 'eat some eggs', status: 1, id: 6},
  {task: 'eat some Maine Lobster', status: 0, id: 7}
]
let currentID = 7

FBP.debug(true)

/**
 * Define the networks/connections
 */

FBP.registerNetwork({
  name: 'search',
  processes: [
    {name: 'filter', component: 'filter'},
    {name: 'sendHTTPResponse', component: 'sendHTTPResponse'}
  ],
  connections: {
    'filter.output': 'sendHTTPResponse.data'
  }
})

FBP.registerNetwork({
  name: 'allTodos',
  processes: [
    {name: 'sendHTTPResponse', component: 'sendHTTPResponse'},
    {name: 'trash', component: 'trash'}
  ],
  connections: {
    'sendHTTPResponse.output': 'trash.data'
  }
})

FBP.registerNetwork({
  name: 'createTodo',
  processes: [
    {name: 'sendHTTPResponse', component: 'sendHTTPResponse'},
    {name: 'createTodo', component: 'update'},
    {name: 'insert', component: 'insert'},
    {name: 'trash', component: 'trash'}
  ],
  connections: {
    'createTodo.output': 'insert.el',
    'insert.output': 'sendHTTPResponse.data',
    'sendHTTPResponse.output': 'trash.data'
  }
})

FBP.registerNetwork({
  name: 'updateTodo',
  processes: [
    {name: 'sendHTTPResponse', component: 'sendHTTPResponse'},
    {name: 'update', component: 'update'},
    {name: 'find', component: 'find'},
    {name: 'insert', component: 'insert'},
    {name: 'trash', component: 'trash'}
  ],
  connections: {
    'find.output': 'update.obj',
    'find.outputIdx': 'insert.idx', // NOTE: sync dependnt?????
    'find.outputErr': 'trash.data', // TODO: don't just trash
    'update.output': 'insert.el',
    'insert.output': 'sendHTTPResponse.data',
    'sendHTTPResponse.output': 'trash.data'
  }
})

FBP.registerNetwork({
  name: 'deleteTodo',
  processes: [
    {name: 'sendHTTPResponse', component: 'sendHTTPResponse'},
    {name: 'deleteElement', component: 'deleteElement'},
    {name: 'find', component: 'find'}
  ],
  connections: {
    'find.output': 'deleteElement.el',
    'deleteElement.output': 'sendHTTPResponse.data'
  }
})

/**
 * Actually run the networks on route requests
 */

app.get('/search', function (req, res, next) {
  FBP.go(
    'search',
    {
      'filter.filterOn': req.query.search,
      'filter.coll': todos,
      'filter.key': 'task',
      'sendHTTPResponse.res': res
    }
  )
})

/**
 * Get a 401 error
 */
app.get('/testError', function (req, res, next) {
  res.statusCode = 401

  FBP.go(
    'allTodos',
    {
      'sendHTTPResponse.data': 'this is an error',
      'sendHTTPResponse.res': res
    }
  )
})

/**
 * Get all ToDos
 */
app.get('/todos', function (req, res, next) {
  FBP.go(
    'allTodos',
    {
      'sendHTTPResponse.data': todos,
      'sendHTTPResponse.res': res
    }
  )
})

/**
 * Create a new ToDo
 */
app.post('/todos', function (req, res, next) {
  // increment currentID
  currentID = currentID + 1

  FBP.go(
    'createTodo',
    {
      'createTodo.obj': {},
      'createTodo.obj2': {
        id: currentID,
        task: req.body.task,
        status: 0
      },
      'insert.coll': todos,
      'insert.idx': null,
      'sendHTTPResponse.res': res
    }
  )
})

/**
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
      'update.obj2': req.body,
      'sendHTTPResponse.res': res
    }
  )
})

/**
 * Delete a ToDo
 */
app.delete('/todo/:id', function (req, res, next) {
  FBP.go(
    'deleteTodo',
    {
      'find.value': parseInt(req.params.id, 10),
      'find.coll': todos,
      'find.key': 'id',
      'deleteElement.coll': todos,
      'sendHTTPResponse.res': res
    }
  )
})

const port = parseInt(process.env.PORT) || config.port
app.listen(port) // express
console.log(`todo service listening on port ${port}`)

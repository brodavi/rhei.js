FBP.debug(true)

const choo = require('choo')
const app = choo()
const config = require('./config.js')

// import the main template
const main = require('./main.js')

const host = location.hostname
const protocol = location.protocol
const port = config.port

console.log('config: ', config);

app.use(function (state, emitter) {
  // initialize default state (if you see this, something is wrong)
  state.filterString = ''
  state.filterDone = 0
  state.todos = [
    {task: 'default task 1', status: 0, id: 1},
    {task: 'default task 2', status: 1, id: 2},
    {task: 'default task 3', status: 0, id: 3}
  ]
  state.errors = []

  // delete a todo
  emitter.on('deleteTodo', function deleteTodo (id) {
    FBP.go(
      'ajax',
      {
        'ajax.url': `${protocol}//${host}:${port}/todo/${id}`,
        'ajax.method': 'DELETE',
        'ajax.data': null,
        'storeTodos.key': 'todos', // parameterization of storage component (needs localstorage key)
      }
    )
  })

  // toggle a todo's status
  emitter.on('toggleStatus', function toggleStatus (id, status) {
    console.log('toggling status with: ', id, status)
    FBP.go(
      'ajax',
      {
        'ajax.url': `${protocol}//${host}:${port}/todo/${id}`,
        'ajax.method': 'PUT',
        'ajax.data': { status: status },
        'storeTodos.key': 'todos', // parameterization of storage component (needs localstorage key)
      }
    )
  })

  // get the most recent todo list from the server
  emitter.on('getAll', function getAll () {
    FBP.go(
      'ajax',
      {
        'ajax.url': `${protocol}//${host}:${port}/todos`,
        'ajax.method': 'GET',
        'ajax.data': null,
        'storeTodos.key': 'todos'
      }
    )
  })

  emitter.on('search', function search (query) {
    FBP.go(
      'ajax',
      {
        'ajax.url': `${protocol}//${host}:${port}/search?search=${query}`,
        'ajax.method': 'GET',
        'ajax.data': null,
        'storeTodos.key': 'todos' // parameterization of storage component (needs localstorage key)
      }
    )
  })

  // NOTE: filtering here is dumb. try to make it more like a real query
  emitter.on('filter', function filter (type, filterOn) {
    console.log('filtering on: ', type, filterOn)
    if (type === 'task') {
      state.filterString = filterOn
    } else {
      state.filterDone = filterOn
    }
    FBP.go(
      'filter',
      {
        'getTodos.key': 'todos',
        'filter.key': type === 'task' ? 'task' : 'status',
        'filter.filterOn': filterOn
      }
    )
  })

  emitter.on('add', function add (text) {
    FBP.go(
      'ajax',
      {
        'ajax.url': `${protocol}//${host}:${port}/todos`,
        'ajax.method': 'POST',
        'ajax.data': {task: text, status: 'in progress'},
        'storeTodos.key': 'todos' // parameterization of storage component (needs localstorage key)
      }
    )
  })

  emitter.on('testError', function testError () {
    FBP.go(
      'ajax',
      {
        'ajax.url': `${protocol}//${host}:${port}/testError`,
        'ajax.method': 'GET',
        'ajax.data': null,
        'storeTodos.key': 'todos',
        'storeErr.key': 'errors'
      }
    )
  })

  /**
   * NOTE: defining component and networks here under app.use because we need the state and emitter
   */

  /**
   * Define specialized components for this app
   */

  /**
   * Update the ToDo list data store
   * @param {ip} todos - A list of ToDos
   * @param {port} output - The output port
   */
  FBP.registerComponent({
    name: 'updateToDoList',
    inPorts: ['todos'],
    outPorts: ['output'],
    body: function updateToDoList (todos, output) {
      state.todos = todos.data
      emitter.emit('render')
      output(todos)
    }
  })

  /**
   * Add an error to the Errors list data store
   * @param {ip} error - An error to append to the errors list data store
   * @param {port} output - The output port
   */
  FBP.registerComponent({
    name: 'updateErrors',
    inPorts: ['error'],
    outPorts: ['output'],
    body: function updateErrors (error, output) {
      state.errors.push(error.data)
      setTimeout(function removeError () {
        FBP.log('removing error: ', error.data)
        state.errors.splice(state.errors.indexOf(error.data), 1)
        emitter.emit('render')
      }, 3000)
      emitter.emit('render')
      output(error)
    }
  })

  /*
   * Define the networks
   */

  FBP.registerNetwork({
    name: 'ajax',
    processes: [
      {name: 'ajax', component: 'ajax'},
      {name: 'storeTodos', component: 'localStorageStore'},
      {name: 'storeErr', component: 'localStorageStore'},
      {name: 'updateToDoList', component: 'updateToDoList'},
      {name: 'log', component: 'log'},
      {name: 'trash', component: 'trash'},
      {name: 'updateErrors', component: 'updateErrors'}
    ],
    connections: {
      'ajax.output': 'log.input',
      'log.output': 'storeTodos.data',
      'storeTodos.output': 'updateToDoList.todos',
      'updateToDoList.output': 'trash.data',

      // error branch
      'ajax.outputErr': 'storeErr.data',
      'storeErr.output': 'updateErrors.error',
      'updateErrors.output': 'trash.data'
    }
  })

  FBP.registerNetwork({
    name: 'filter',
    processes: [
      {name: 'getTodos', component: 'localStorageRetrieve'},
      {name: 'filter', component: 'filter'},
      {name: 'updateToDoList', component: 'updateToDoList'},
      {name: 'trash', component: 'trash'}
    ],
    connections: {
      'getTodos.output': 'filter.coll',
      'filter.output': 'updateToDoList.todos',
      'updateToDoList.output': 'trash.data'
    }
  })

  emitter.emit('getAll')
  emitter.emit('testError')
})

// create a route
app.route('/', main)

// start app
app.mount('div')
